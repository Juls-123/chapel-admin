import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import {
  mapServiceTypeDbToUi,
  mapServiceTypeUiToDb,
  type ServiceTypeUi,
} from "@/lib/types";

export type ServiceType = ServiceTypeUi;
export type ServiceStatus = "scheduled" | "active" | "completed" | "canceled";

export interface ServiceItem {
  id: string;
  type: ServiceType;
  date: string; // ISO datetime
  status: ServiceStatus;
  levels: { id: string; code: string; name: string | null }[]; // e.g., ["100L", "200L"]
  name?: string;
  created_by?: string;
  created_by_name?: string;
  gender_constraint?: 'male' | 'female' | 'both';
}

export interface CreateServiceInput {
  service_type: "devotion" | "special" | "seminar";
  devotion_type?: "morning" | "evening";
  name?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:mm format
  applicable_levels: string[]; // level IDs
  gender_constraint: "male" | "female" | "both";
}

export class ServiceService {
  private supabase: SupabaseClient<Database>;

  constructor(client?: SupabaseClient<Database>) {
    this.supabase =
      client ||
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  }

  async getServiceById(id: string): Promise<ServiceItem | null> {
    const { data, error } = await this.supabase
      .from("services")
      .select(
        `id, service_type, devotion_type, name, service_date, service_time, status,
         service_levels(level_id, levels(code))`
      )
      .eq("id", id)
      .single();
    if (error) {
      if ((error as any).code === "PGRST116") return null; // not found
      throw Object.assign(new Error("Failed to fetch service"), {
        status: 500,
        code: "SERVICE_FETCH_FAILED",
        details: error.message,
      });
    }
    const levelCodes = ((data as any).service_levels || [])
      .map((sl: any) => sl.levels?.code)
      .filter(Boolean);

    const isSpecial = (data as any).service_type !== "devotion";
    let uiType: ServiceType;
    if (isSpecial) {
      uiType = "special";
    } else if ((data as any).devotion_type) {
      uiType =
        ((data as any).devotion_type as string) === "evening"
          ? "evening"
          : "morning";
    } else {
      let hour = 7; // Default to morning
      if ((data as any).service_time) {
        const [timeHour] = (data as any).service_time.split(":");
        hour = parseInt(timeHour, 10) || 7;
      }
      uiType = hour >= 12 ? "evening" : "morning";
    }

    let dateString = (data as any).service_date;
    if ((data as any).service_time) {
      const timeFormatted = (data as any).service_time.substring(0, 5); // "10:00:00" -> "10:00"
      dateString = `${(data as any).service_date}T${timeFormatted}:00.000Z`;
      // Validate the constructed date string
      const testDate = new Date(dateString);
      if (isNaN(testDate.getTime())) {
        console.error("Invalid date constructed:", dateString);
        // Fallback to just the date
        dateString = (data as any).service_date;
      } else {
        console.log("Valid date constructed:", dateString);
      }
    }

    return data
      ? {
          id: data.id,
          type: uiType,
          date: dateString,
          status: data.status as ServiceStatus,
          levels: levelCodes,
          name: data.name || undefined,
        }
      : null;
  }

  async getServices(
    date?: string,
    statuses?: ServiceStatus[]
  ): Promise<ServiceItem[]> {
    let query = this.supabase
      .from("services")
      .select(
        `id, service_type, devotion_type, name, service_date, service_time, status, created_by,
         service_levels(level_id, levels(id, code, name)),
         admins!services_created_by_fkey(first_name, last_name)`
      )
      .order("service_date", { ascending: false });

    if (date) {
      query = query.eq("service_date", date);
    }

    // Filter by status if provided - exclude canceled services by default
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    } else {
      // Default: exclude canceled services
      query = query.in("status", ["scheduled", "active", "completed"]);
    }

    const { data, error } = await query;

    if (error) {
      throw Object.assign(new Error("Failed to fetch services"), {
        status: 500,
        code: "SERVICES_FETCH_FAILED",
        details: error.message,
      });
    }

    return (data || []).map((row: any) => {
      const levelsOut = (row.service_levels || []).map((sl: any) => ({
        id: sl.level_id,
        code: sl.levels?.code,
        name: sl.levels?.name,
      }));

      const isSpecial = row.service_type !== "devotion";
      let uiType: ServiceType;
      if (isSpecial) {
        uiType = "special";
      } else if (row.devotion_type) {
        uiType = row.devotion_type === "evening" ? "evening" : "morning";
      } else {
        let hour = 7; // Default to morning
        if (row.service_time) {
          const [timeHour] = row.service_time.split(":");
          hour = parseInt(timeHour, 10) || 7;
        }
        uiType = hour >= 12 ? "evening" : "morning";
      }

      let dateString = row.service_date;
      if (row.service_time) {
        const timeFormatted = row.service_time.substring(0, 5); // "10:00:00" -> "10:00"
        dateString = `${row.service_date}T${timeFormatted}:00.000Z`;
        // Validate the constructed date string
        const testDate = new Date(dateString);
        if (isNaN(testDate.getTime())) {
          console.error("Invalid date constructed:", dateString);
          // Fallback to just the date
          dateString = row.service_date;
        } else {
          
        }
      }

      let created_by_name: string | undefined;
      if (row.admins) {
        const rel = row.admins;
        if (Array.isArray(rel) && rel.length > 0) {
          created_by_name =
            `${rel[0]?.first_name ?? ""} ${rel[0]?.last_name ?? ""}`.trim() ||
            undefined;
        } else if (typeof rel === "object") {
          created_by_name =
            `${rel?.first_name ?? ""} ${rel?.last_name ?? ""}`.trim() ||
            undefined;
        }
      }

      return {
        id: row.id,
        type: uiType,
        date: dateString,
        status: row.status as ServiceStatus,
        levels: levelsOut,
        name: row.name || undefined,
        created_by: row.created_by || undefined,
        created_by_name,
      } as ServiceItem;
    });
  }

  async createService(
    input: CreateServiceInput,
    createdBy: string
  ): Promise<ServiceItem> {
    const isSpecial =
      input.service_type === "special" || input.service_type === "seminar";
    const service_type = isSpecial ? ("special" as any) : ("devotion" as any);
    const devotion_type = isSpecial ? null : (input.devotion_type as any); // 'morning' | 'evening'

    const { data: created, error } = await this.supabase
      .from("services")
      .insert({
        service_type,
        devotion_type,
        name: input.name ?? null,
        service_date: input.date, // Store date only (YYYY-MM-DD)
        service_time: input.time, // Store time only (HH:mm)
        status: "scheduled",
        created_by: createdBy,
      })
      .select(
        "id, service_type, devotion_type, name, service_date, service_time, status"
      )
      .single();

    if (error || !created) {
      throw Object.assign(new Error("Failed to create service"), {
        status: 500,
        code: "SERVICE_CREATE_FAILED",
        details: error?.message,
      });
    }

    let dateString = created.service_date;
    if (created.service_time) {
      const timeFormatted = created.service_time.substring(0, 5); // "10:00:00" -> "10:00"
      dateString = `${created.service_date}T${timeFormatted}:00.000Z`;
      // Validate the constructed date string
      const testDate = new Date(dateString);
      if (isNaN(testDate.getTime())) {
        dateString = created.service_date;
      }
    }

    if (input.applicable_levels.length > 0) {
      const serviceLevelsData = input.applicable_levels.map((levelId) => ({
        service_id: created.id,
        level_id: levelId,
      }));

      const { error: levelsError } = await this.supabase
        .from("service_levels")
        .insert(serviceLevelsData);

      if (levelsError) {
        await this.supabase.from("services").delete().eq("id", created.id);
        throw Object.assign(new Error("Failed to assign levels to service"), {
          status: 500,
          code: "SERVICE_LEVELS_CREATE_FAILED",
          details: levelsError.message,
        });
      }
    }

    const { data: assignedLevels } = await this.supabase
      .from("levels")
      .select("id, code, name")
      .in("id", input.applicable_levels);

    const levelsOut =
      assignedLevels?.map((level) => ({
        id: level.id,
        code: level.code,
        name: level.name,
      })) || [];

    return {
      id: created.id,
      type: isSpecial
        ? "special"
        : (created as any).devotion_type === "evening"
        ? "evening"
        : "morning",
      date: dateString,
      status: created.status as ServiceStatus,
      levels: levelsOut,
      name: created.name || undefined,
    };
  }

  async updateService(
    id: string,
    updates: Partial<ServiceItem>
  ): Promise<ServiceItem> {
    const dbUpdate: any = {};
    if (updates.type) {
      const isSpecial = updates.type === "special";
      dbUpdate.service_type = isSpecial
        ? ("special" as any)
        : ("devotion" as any);
      dbUpdate.devotion_type = isSpecial ? null : (updates.type as any);
    }
    if (updates.date) {
      const date = new Date(updates.date);
      dbUpdate.service_date = date.toISOString().split("T")[0];
      dbUpdate.service_time = date.toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (updates.status) dbUpdate.status = updates.status;
    if (typeof updates.name !== "undefined")
      dbUpdate.name = updates.name ?? null;

    const { data: updated, error } = await this.supabase
      .from("services")
      .update(dbUpdate)
      .eq("id", id)
      .select(
        "id, service_type, devotion_type, name, service_date, service_time, status, service_levels(level_id, levels(code))"
      )
      .single();

    if (error || !updated) {
      throw Object.assign(new Error("Failed to update service"), {
        status: 500,
        code: "SERVICE_UPDATE_FAILED",
        details: error?.message,
      });
    }

    let levelsOut: { id: string; code: string; name: string | null}[] = [];
    if (Array.isArray((updates as any).levels)) {
      const levelCodes = (updates as any).levels as string[];
      const patch: any = {
        level_100: levelCodes.includes("100"),
        level_200: levelCodes.includes("200"),
        level_300: levelCodes.includes("300"),
        level_400: levelCodes.includes("400"),
        level_500: levelCodes.includes("500"),
      };
      await this.supabase.from("services").update(patch).eq("id", id);
      const activeLevelCodes = Object.entries(patch)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => k.replace("level_", ""));

      // Fetch full level data for active levels
      const { data: levelData } = await this.supabase
        .from("levels")
        .select("id, code, name")
        .in("code", activeLevelCodes);

      levelsOut = levelData || [];
    } else {
      levelsOut = ((updated as any).service_levels || []).map((sl: any) => ({
        id: sl.level_id,
        code: sl.levels?.code,
        name: sl.levels?.name,
      }));
    }

    let dateString = updated.service_date;
    if (updated.service_time) {
      const timeFormatted = updated.service_time.substring(0, 5); // "10:00:00" -> "10:00"
      dateString = `${updated.service_date}T${timeFormatted}:00.000Z`;
      // Validate the constructed date string
      const testDate = new Date(dateString);
      if (isNaN(testDate.getTime())) {
        console.error("Invalid date constructed:", dateString);
        // Fallback to just the date
        dateString = updated.service_date;
      } else {
        console.log("Valid date constructed:", dateString);
      }
    }

    return {
      id: updated.id,
      type:
        (updated as any).service_type !== "devotion"
          ? "special"
          : (updated as any).devotion_type === "evening"
          ? "evening"
          : "morning",
      date: dateString,
      status: updated.status as ServiceStatus,
      levels: levelsOut,
      name: updated.name || undefined,
    };
  }

  async updateServiceStatus(
    id: string,
    status: Extract<ServiceStatus, "completed" | "canceled">
  ): Promise<ServiceItem> {
    const { data: updated, error } = await this.supabase
      .from("services")
      .update({ status })
      .eq("id", id)
      .select(
        "id, service_type, devotion_type, name, service_date, service_time, status, service_levels(level_id, levels(code))"
      )
      .single();

    if (error || !updated) {
      throw Object.assign(new Error("Failed to update status"), {
        status: 500,
        code: "SERVICE_STATUS_UPDATE_FAILED",
        details: error?.message,
      });
    }

    let levelsOut = ((updated as any).service_levels || []).map((sl: any) => ({
      id: sl.level_id,
      code: sl.levels?.code,
      name: sl.levels?.name,
    }));

    let dateString = updated.service_date;
    if (updated.service_time) {
      const timeFormatted = updated.service_time.substring(0, 5); // "10:00:00" -> "10:00"
      dateString = `${updated.service_date}T${timeFormatted}:00.000Z`;
      // Validate the constructed date string
      const testDate = new Date(dateString);
      if (isNaN(testDate.getTime())) {
        console.error("Invalid date constructed:", dateString);
        // Fallback to just the date
        dateString = updated.service_date;
      } else {
        console.log("Valid date constructed:", dateString);
      }
    }

    return {
      id: updated.id,
      type:
        (updated as any).service_type !== "devotion"
          ? "special"
          : (updated as any).devotion_type === "evening"
          ? "evening"
          : "morning",
      date: dateString,
      status: updated.status as ServiceStatus,
      levels: levelsOut,
      name: updated.name || undefined,
    };
  }
}
