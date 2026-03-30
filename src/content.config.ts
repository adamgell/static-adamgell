import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    keywords: z.array(z.string()).optional(),
  }),
});

const cmtrace = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/cmtrace" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    type: z.enum(["post", "release"]).default("post"),
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, cmtrace };
