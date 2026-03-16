import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/*schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["!spatial_ref_sys", "!geography_columns", "!geometry_columns"],
});
