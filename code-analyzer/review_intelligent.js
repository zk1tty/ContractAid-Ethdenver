// import { } from "langchain/chains";
import dotenv from 'dotenv';
dotenv.config();

import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { BufferMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  AIMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { BaseMessage } from "langchain/schema";
import { StringOutputParser } from "@langchain/core/output_parsers";


// const REPO_PATH = "contracts"
const openAIKey = process.env.OPENAI_API_KEY;

export async function intelligentlyAnalyseReview(REPO_PATH="contracts", lang="sol") {
  var loader;
  if(lang === "sol"){
    loader = new DirectoryLoader(REPO_PATH, {
      ".sol": (path) => new TextLoader(path),
    });
  } else {
    loader = new DirectoryLoader(REPO_PATH, {
      ".rs": (path) => new TextLoader(path),
    });
  }

  const docs = await loader.load();
  const soliditySplitter = RecursiveCharacterTextSplitter.fromLanguage(lang, {
    chunkSize: 2000,
    chunkOverlap: 200,
  });
  const texts = await soliditySplitter.splitDocuments(docs);

  console.log("Loaded ", texts.length, " documents.");

  const privateKey = process.env.SUPABASE_PRIVATE_KEY;
  if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error(`Expected env var SUPABASE_URL`);

  const client = createClient(url, privateKey);
  // console.log("Supabase client", client);
  const vectorStore = await SupabaseVectorStore.fromDocuments(
    texts,
    new OpenAIEmbeddings(),
    {
      client,
      tableName: "documents",
      queryName: "match_documents",
    }
  );

  // console.log("vectorStore instance", vectorStore);

  const retriever = vectorStore.asRetriever({
    searchType: "mmr", // Use max marginal relevance search
    searchKwargs: { fetchK: 8 },
  });

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    apiKey: openAIKey,
  }).pipe(
    new StringOutputParser()
  );

  const memory = new BufferMemory({
    returnMessages: true, // Return stored messages as instances of `BaseMessage`
    memoryKey: "chat_history", // This must match up with our prompt template input variable.
  });

  const questionGeneratorTemplate = ChatPromptTemplate.fromMessages([
    AIMessagePromptTemplate.fromTemplate(
      "Given the following conversation about a codebase and a follow up question, rephrase the follow up question to be a standalone question."
    ),
    new MessagesPlaceholder("chat_history"),
    AIMessagePromptTemplate.fromTemplate(`Follow Up Input: {question}
  Standalone question:`),
  ]);

  const combineDocumentsPrompt = ChatPromptTemplate.fromMessages([
    AIMessagePromptTemplate.fromTemplate(
      "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\n"
    ),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("Question: {question}"),
  ]);

  const combineDocumentsChain = RunnableSequence.from([
    {
      question: (output) => output,
      chat_history: async () => {
        const { chat_history } = await memory.loadMemoryVariables({});
        return chat_history;
      },
      context: async (output) => {
        const relevantDocs = await retriever.getRelevantDocuments(output);
        return formatDocumentsAsString(relevantDocs);
      },
    },
    combineDocumentsPrompt,
    model,
    new StringOutputParser(),
  ]);

  const conversationalQaChain = RunnableSequence.from([
    {
      question: (i) => i.question,
      chat_history: async () => {
        const { chat_history } = await memory.loadMemoryVariables({});
        return chat_history;
      },
    },
    questionGeneratorTemplate,
    model,
    new StringOutputParser(),
    combineDocumentsChain,
  ]);

  const question = "summarize the code above and explain all the vulnerabilities in the code in a table and categorize the vulnerabilities as high, medium, low and also suggest improvements to fix the vulnerabilities";
  const result = await conversationalQaChain.invoke({
    question,
  });

  await memory.saveContext(
    {
      input: question,
    },
    {
      output: result,
    }
  );

  const question2 =
    "can you create a table for the above findings?";
  const result2 = await conversationalQaChain.invoke({
    question: question2,
  });

  console.log(result2)

  return result2;
};

// intelligentlyAnalyseReview().then(() => process.exit());