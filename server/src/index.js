import app from "./app.js";
import { config } from "./config.js";

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});
