import { buildApp } from "./app.js";
import { env } from "./config/env.js";
buildApp().listen(env.PORT, () => console.log(`backend listening on :${env.PORT}`));
