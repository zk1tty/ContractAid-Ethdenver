import { OpenAIEmbeddings } from "@langchain/openai";
import {  } from "langchain/chains";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate } from "langchain/prompts";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";

const DIRECTORY_PATH = "contracts"

export const intelligentlyAnalyseReview = async (dataId) => {
  const loader = new DirectoryLoader(REPO_PATH, {
    ".sol": (path) => new TextLoader(path),
  });
  const docs = await loader.load();
  const soliditySplitter = RecursiveCharacterTextSplitter.fromLanguage("sol", {
    chunkSize: 2000,
    chunkOverlap: 200,
  });
  const texts = await soliditySplitter.splitDocuments(docs);
  
  console.log("Loaded ", texts.length, " documents.");


  const prompt = new PromptTemplate({ 
    template: `Reviews:
    {text}
    
    ---
    Create 5 most common labels for these reviews and give rating of 1 to 5 ⭐, with 1 ⭐ being the lowest rating and 5 ⭐ being the highest rating, it should be based on the occurrence rate, and if the label is negative as 👎 or positive as 👍.
    Example:
    Label Name (positivity): ⭐ emoji
    `,
    inputVariables: ["text"] 
  });
  
  const model = new OpenAI({ temperature: 0.5 });
  console.log("Reached here - 1");
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  const docs = await textSplitter.createDocuments([text]);
  console.log("Reached here - 2");

  
  // This convenience function creates a document chain prompted to summarize a set of documents.
  const chain = loadSummarizationChain(model, { type: "map_reduce", combinePrompt: prompt });
  console.log("Chain", chain);
  console.log("Reached here - 3");

  const res = await chain.call({
    input_documents: docs,
  });
  console.log("response from chain.call()", JSON.stringify(res))
  return res
};