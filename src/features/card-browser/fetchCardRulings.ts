export type CardRuling = {
  id: string;
  source: string;
  date: string;
  ruling: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default async function fetchCardRulings(url: string): Promise<CardRuling[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`[API error] ${response.status} — ${response.statusText}`);
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Array.isArray(json.data)) {
    throw new Error("[API error] Rulings response did not contain a data list");
  }

  return json.data.map((ruling: unknown) => {
    if (
      !isRecord(ruling) ||
      typeof ruling.oracle_id !== "string" ||
      typeof ruling.source !== "string" ||
      typeof ruling.published_at !== "string" ||
      typeof ruling.comment !== "string"
    ) {
      throw new Error("[API error] Rulings response contained an invalid entry");
    }

    return {
      id: ruling.oracle_id,
      source: ruling.source,
      date: ruling.published_at,
      ruling: ruling.comment,
    };
  });
}
