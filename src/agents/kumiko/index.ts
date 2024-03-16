import { exec, spawn } from "node:child_process";
import { Agent, type AgentConfig } from "../../framework/client";
import dotenv from "dotenv";

dotenv.config();
const {
	KUMIKO_TOKEN,
	KUMIKO_CLIENT_ID,
	WATCHTOWER_PORT,
	GITHUB_WEBHOOK_SECRET,
} = process.env;

interface KumikoConfig extends AgentConfig {
	port: string;
	githubWebhookSecret: string;
}

if (!GITHUB_WEBHOOK_SECRET)
	throw new Error("GITHUB_WEBHOOK_SECRET is not defined");
if (!WATCHTOWER_PORT) throw new Error("WATCHTOWER_PORT is not defined");
if (!KUMIKO_TOKEN || !KUMIKO_CLIENT_ID) {
	throw new Error(
		"Environment variables KUMIKO_TOKEN and KUMIKO_CLIENT_ID must be set.",
	);
}

const config: KumikoConfig = {
	name: "kumiko",
	token: KUMIKO_TOKEN,
	client_id: KUMIKO_CLIENT_ID,
	port: WATCHTOWER_PORT,
	githubWebhookSecret: GITHUB_WEBHOOK_SECRET,
	intents: ["Guilds", "GuildMessages"],
};

config.init = () => {
	const watchtower = spawn(
		"ts-node",
		["./src/agents/kumiko/watchtower.ts", config.port, config.githubWebhookSecret],
		{
			stdio: "pipe",
		},
	);
	watchtower.stdout.on("data", (data: Buffer) => {
		console.log(data.toString());
	});
	watchtower.stderr.on("data", (err: Buffer) => {
		console.error(err.toString());
	});
};

export const kumiko = new Agent(config);

kumiko.on("messageCreate", async (message) => {
	console.log(message.content);
	const messageContent = message.content.toLowerCase();

	if (messageContent.includes("status")) {
		await kumiko.sendMessage(
			message.channelId,
			"**`( =ω=)b`: all systems operational**",
		);
	}
});

function isSystemdServiceActive(serviceName: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		exec(`sudo systemctl is-active ${serviceName}`, (error, stdout) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout.trim() === "active");
			}
		});
	});
}

// setInterval(async () => {
// 	const serviceName = "mailchimp";
// 	try {
// 		const isActive = await isSystemdServiceActive(serviceName);
// 		if (isActive) {
// 			console.log(`${serviceName} is active.`);
// 		} else {
// 			console.log(`${serviceName} is not active.`);
// 			await agent.sendMessage(
// 				"your-channel-id",
// 				`${serviceName} is not active.`,
// 			);
// 		}
// 	} catch (error) {
// 		console.error(`Error checking status of ${serviceName}:`, error);
// 	}
// }, 60000); // 60000ms = 1 minute
