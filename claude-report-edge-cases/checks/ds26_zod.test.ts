// ds26 split checks for zod bugs, copied case by case from the maintainers' fix tests.
// Names: <bug>__<R|U>_<what>. Copied into packages/zod/src/v4/classic/tests/ when scoring.
import { expect, test } from "vitest";
import * as z from "zod/v4";

const protoData = () => JSON.parse('{"__proto__":{"a":1},"fr":"y"}');

test("z6641__R_refine_key_schema_reports_proto", () => {
  const locale = z.string().refine((k) => ["fr", "de"].includes(k));
  expect(z.record(locale, z.string()).safeParse(protoData()).error?.issues).toMatchObject([
    { code: "invalid_key", path: ["__proto__"] },
  ]);
});

test("z6641__U_regex_key_schema_reports_proto", () => {
  expect(z.record(z.string().regex(/^[a-z]{2}$/), z.string()).safeParse(protoData()).error?.issues).toMatchObject([
    { code: "invalid_key", path: ["__proto__"] },
  ]);
});

test("z6641__U_partialRecord_enum_reports_unrecognized", () => {
  expect(z.partialRecord(z.enum(["fr", "de"]), z.string()).safeParse(protoData()).error?.issues).toMatchObject([
    { code: "unrecognized_keys", keys: ["__proto__"] },
  ]);
});

test("z6641__R_passing_proto_key_never_written", () => {
  const parsed: any = z.record(z.string().min(2), z.string()).parse(protoData());
  expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  expect(parsed).toEqual({ fr: "y" });
});

test("z6659__R_array_max_in_union_reports_too_big", () => {
  const schema = z.union([z.array(z.string()).max(2), z.string()]);
  expect(schema.safeParse(["a", "b", "c"]).error!.issues).toMatchObject([{ code: "too_big", origin: "array", path: [] }]);
});

test("z6659__U_int_vs_number_max_reports_too_big", () => {
  expect(z.union([z.int(), z.number().max(5)]).safeParse(7.5).error!.issues).toMatchObject([{ code: "too_big" }]);
});

test("z6659__U_two_oversized_arrays_stay_invalid_union", () => {
  const both = z.union([z.array(z.string()).max(2), z.array(z.number()).max(1)]);
  expect(both.safeParse(["a", "b", "c"]).error!.issues).toMatchObject([{ code: "invalid_union" }]);
});
