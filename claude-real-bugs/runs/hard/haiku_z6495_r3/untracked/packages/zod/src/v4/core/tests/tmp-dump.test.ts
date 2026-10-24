import { test } from "vitest";
import { z } from "zod/v4";
import { compileFn } from "../compile.js";

test("dump", () => {
  const schema = z.object({ a: z.string().default(() => "d") });
  const fn = compileFn(schema as any, { debug: true });
  process.stdout.write("CODE\n" + (fn as any).code + "\n");
});
