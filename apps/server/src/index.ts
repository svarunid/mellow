import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { integrationRoutes } from "./routes/integration";
import { projectRoutes } from "./routes/project";
import { projectMemberRoutes } from "./routes/project-member";
import { webhookRoutes } from "./routes/webhooks";
import { workspaceRoutes } from "./routes/workspace";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
	.use(cors({ origin: process.env.WEB_URL ?? "http://localhost:5173" }))
	.use(workspaceRoutes)
	.use(projectRoutes)
	.use(projectMemberRoutes)
	.use(webhookRoutes)
	.use(integrationRoutes)
	.listen(port);

console.info(`Server running at http://localhost:${port}`);

export type App = typeof app;
