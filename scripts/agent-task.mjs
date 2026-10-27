import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const roles = ["planner", "developer", "tester", "critic"];

/** Produce an instruction packet for transports that cannot select native custom agent types. */
export function createRolePacket(role, task) {
  if (!roles.includes(role)) throw new Error("Choose planner, developer, tester or critic; role paths are not accepted.");
  if (typeof task !== "string" || !task.trim()) throw new Error("A nonempty bounded task is required.");
  const source = readFileSync(new URL(`../.codex/agents/${role}.toml`, import.meta.url), "utf8");
  // Preserve the reviewed definition verbatim instead of introducing a second instruction source
  // or pretending that task_name selects a native configured role.
  return {
    task_name: role,
    fork_turns: "none",
    message: `Apply the developer_instructions in this reviewed role definition. This is explicit instruction dispatch, not native custom-agent selection. Permissions still come from the parent session.\n\n${source}\nTask:\n${task.trim()}`,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: npm run agent:packet -- <role> "<bounded task>"');
    console.log(JSON.stringify(createRolePacket(process.argv[2], process.argv[3]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
