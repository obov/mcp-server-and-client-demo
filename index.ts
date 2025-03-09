import Anthropic from "@anthropic-ai/sdk";
import * as readlineSync from "readline-sync";
import * as dotenv from "dotenv";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "tsx",
  args: ["server.ts"],
});

export const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

await client.connect(transport);

// 환경 변수 로드
dotenv.config();

// API 키 확인
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY가 .env 파일에 설정되지 않았습니다.");
  process.exit(1);
}

// 처리되지 않은 Promise 거부 처리
process.on("unhandledRejection", (reason, promise) => {
  console.error("처리되지 않은 Promise 거부:", reason);
});

// 단일 메시지 전송 함수
async function sendMessage(userInput: string) {
  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 1000,
      messages: [{ role: "user", content: userInput }],
      tools: [
        {
          name: "getWeather",
          description: "현재 날씨 정보를 가져옵니다",
          input_schema: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "날씨를 확인할 도시 이름",
              },
            },
            required: ["city"],
          },
        },
      ],
    });

    const useTool =
      response.content.length <= 2
        ? response.content.find((content) => content.type === "tool_use")
        : null;

    if (useTool) {
      const toolResult = await client.callTool({
        name: useTool.name,
        arguments: useTool.input as Record<string, unknown>,
      });
      const responseWithTool = await anthropic.messages.create({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 1000,
        messages: [
          { role: "user", content: userInput },
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: useTool.id,
                // @ts-ignore
                content: toolResult.content,
              },
            ],
          },
        ],
        tools: [
          {
            name: "getWeather",
            description: "현재 날씨 정보를 가져옵니다",
            input_schema: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "날씨를 확인할 도시 이름",
                },
              },
              required: ["city"],
            },
          },
        ],
      });
      if (
        responseWithTool.content[0] &&
        "text" in responseWithTool.content[0]
      ) {
        return responseWithTool.content[0].text as string;
      } else {
        return JSON.stringify(responseWithTool.content[0]);
      }
    }

    if (response.content[0] && "text" in response.content[0]) {
      return response.content[0].text as string;
    } else {
      return JSON.stringify(response.content[0]);
    }
  } catch (error) {
    console.error("API 호출 오류:", error);
    return "오류가 발생했습니다. 다시 시도해주세요.";
  }
}

// 메인 함수
async function main() {
  console.log(
    'Anthropic Claude와의 대화를 시작합니다. 종료하려면 "exit"를 입력하세요.'
  );

  while (true) {
    const userInput = readlineSync.question("\n사용자: ");

    if (userInput.toLowerCase() === "exit") {
      await client.close();
      console.log("대화를 종료합니다.");
      break;
    }

    const response = await sendMessage(userInput);
    console.log(`\nClaude: ${response}`);
  }
}

main()
  .catch((error) => {
    console.error("프로그램 실행 오류:", error);
  })
  .finally(async () => {
    await client.close();
  });
