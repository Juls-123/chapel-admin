export interface StudentQuery {
  page: number;
  limit: number;
  search: string;
  matric: string;
  level: string | null;
  status: "all" | "active" | "inactive";
  department: string | null;
}

export function parseStudentQuery(request: Request): StudentQuery {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );

  const search = (searchParams.get("search") || "").trim();
  const matric = (searchParams.get("matric") || "").trim();
  const levelRaw = (searchParams.get("level") || "").trim();
  const level = levelRaw || null;
  const departmentRaw = (searchParams.get("department") || "").trim();
  const department = departmentRaw || null;
  const statusParam = (searchParams.get("status") || "all").toLowerCase();
  const status = (
    ["all", "active", "inactive"].includes(statusParam) ? statusParam : "all"
  ) as "all" | "active" | "inactive";

  return { page, limit, search, matric, level, status, department };
}
