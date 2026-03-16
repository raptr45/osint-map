import "dotenv/config";
import { processIngestion } from "../lib/ingest-pipeline";

const args = process.argv.slice(2);
const MOCK_INTEL = args[0] || "Large explosion reported near the Okhmatdyt Children's Hospital in Kyiv. Multiple emergency vehicles on scene.";

processIngestion(MOCK_INTEL)
  .then(() => {
    console.log("🚀 Mock ingestion complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
