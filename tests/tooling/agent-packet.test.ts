import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRolePacket, roles } from "../../scripts/agent-task.mjs";

const expectedRoles = ["planner", "developer", "tester", "critic"];

describe("TC-AGENT-001 reviewed role instruction dispatch", () => {
  it("exposes exactly the four reviewed specialist roles", () => {
    expect(roles).toEqual(expectedRoles);
  });

  it.each(expectedRoles)("dispatches the reviewed %s definition verbatim", (role) => {
    const definition = readFileSync(
      new URL(`../../.codex/agents/${role}.toml`, import.meta.url),
      "utf8",
    );
    const task = `Inspect only docs/requirements.yaml as ${role} without writes.`;
    const packet = createRolePacket(role, task);

    expect(definition).toContain(`name = "${role}"`);
    expect(definition).toContain("developer_instructions =");
    expect(Object.keys(packet).sort()).toEqual(["fork_turns", "message", "task_name"]);
    expect(packet.fork_turns).toBe("none");
    expect(packet.task_name).toBe(role);
    expect(packet.message).toContain(definition);
    expect(packet.message).toContain(`Task:\n${task}`);
    expect(packet.message).toContain(
      "explicit instruction dispatch, not native custom-agent selection",
    );
    expect(packet.message).toContain(
      "Permissions still come from the parent session.",
    );
  });

  it("preserves a bounded multiline task while trimming outer whitespace", () => {
    const task = "Review the approved contract.\nReturn findings without edits.";
    expect(createRolePacket("critic", ` \n${task}\n\t`).message).toMatch(
      new RegExp(`${task.replaceAll(".", "\\.")}$`),
    );
  });

  it.each([
    "default",
    "worker",
    "Planner",
    "PLANNER",
    "../critic",
    "../../.env",
    "critic/../planner",
    "planner\\..\\critic",
    "critic.toml",
    " planner ",
    "",
  ])("rejects an unregistered role or path: %s", (role) => {
    expect(() => createRolePacket(role, "Return a bounded read-only assessment.")).toThrow();
  });

  it.each<[string, unknown]>([
    ["empty", ""],
    ["spaces", "   "],
    ["line breaks", "\n\t\r\n"],
    ["undefined", undefined],
    ["null", null],
    ["number", 123],
    ["object", { task: "Inspect requirements." }],
  ])("rejects a missing or invalid bounded task: %s", (_description, task) => {
    expect(() => createRolePacket("tester", task)).toThrow();
  });
});
