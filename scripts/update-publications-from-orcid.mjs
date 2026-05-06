import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const ORCID_ID = process.env.ORCID_ID || "0000-0002-2809-9116";
const ORCID_URL = `https://orcid.org/${ORCID_ID}`;
const WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const OUTPUT_PATH = path.join(repoRoot, "publications-data.js");
const OVERRIDES_PATH = path.join(repoRoot, "publications-overrides.json");

const TYPE_LABELS = new Map([
  ["journal-article", "Journal Articles"],
  ["conference-paper", "Conference Papers"],
  ["dissertation", "Theses"],
  ["book-chapter", "Book Chapters"],
  ["book", "Books"],
  ["preprint", "Preprints"],
  ["report", "Reports"],
  ["conference-abstract", "Conference Abstracts"],
  ["conference-poster", "Conference Posters"]
]);

const PREFERRED_ORDER = [
  "Journal Articles",
  "Conference Papers",
  "Theses",
  "Book Chapters",
  "Books",
  "Preprints",
  "Reports",
  "Conference Abstracts",
  "Conference Posters",
  "Uncategorized"
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate() {
  return new Date().toISOString().slice(0, 10);
}

function cleanText(value) {
  if (!value) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function buildNote(externalIds) {
  const doi = externalIds.find((item) => item["external-id-type"] === "doi");
  if (doi) {
    return `DOI: ${doi["external-id-value"]}`;
  }

  const isbn = externalIds.find((item) => item["external-id-type"] === "isbn");
  if (isbn) {
    return `ISBN: ${isbn["external-id-value"]}`;
  }

  return "";
}

function getPrimaryDoi(externalIds) {
  const doi = externalIds.find((item) => item["external-id-type"] === "doi");
  return doi?.["external-id-value"]?.toLowerCase() || "";
}

function buildHref(summary, externalIds) {
  if (summary.url?.value) {
    return summary.url.value;
  }

  const doi = externalIds.find((item) => item["external-id-type"] === "doi");
  if (doi?.["external-id-url"]?.value) {
    return doi["external-id-url"].value;
  }

  return "";
}

function buildVenue(summary, type) {
  const journalTitle = cleanText(summary["journal-title"]?.value);
  if (journalTitle) {
    return journalTitle;
  }

  if (type === "conference-paper") {
    return "Conference paper";
  }

  if (type === "dissertation") {
    return "Thesis or dissertation";
  }

  return "Public ORCID record";
}

function normalizeWork(group, overrides) {
  const summary = group["work-summary"]?.[0];
  if (!summary) {
    return null;
  }

  const externalIds = group["external-ids"]?.["external-id"] || [];
  const doi = getPrimaryDoi(externalIds);
  const override = overrides[doi] || {};
  const title = override.title || cleanText(summary.title?.title?.value);
  const year = cleanText(summary["publication-date"]?.year?.value);
  const type = summary.type || "other";
  const sectionTitle = TYPE_LABELS.get(type) || "Uncategorized";

  return {
    sectionTitle,
    item: {
      title,
      authors: override.authors || "Public ORCID record entry",
      venue: override.venue || buildVenue(summary, type),
      year: year || "n.d.",
      note: buildNote(externalIds),
      href: buildHref(summary, externalIds) || undefined
    }
  };
}

async function loadOverrides() {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function sortSections(entries) {
  return entries.sort((a, b) => {
    const aIndex = PREFERRED_ORDER.indexOf(a.title);
    const bIndex = PREFERRED_ORDER.indexOf(b.title);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return safeA - safeB || a.title.localeCompare(b.title);
  });
}

function sortItems(items) {
  return items.sort((a, b) => {
    const yearDiff = Number(b.year || 0) - Number(a.year || 0);
    return yearDiff || a.title.localeCompare(b.title);
  });
}

async function fetchWorks() {
  const response = await fetch(WORKS_URL, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`ORCID request failed with ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const payload = await fetchWorks();
  const overrides = await loadOverrides();
  const grouped = new Map();

  for (const group of payload.group || []) {
    const normalized = normalizeWork(group, overrides);
    if (!normalized || !normalized.item.title) {
      continue;
    }

    if (!grouped.has(normalized.sectionTitle)) {
      grouped.set(normalized.sectionTitle, []);
    }

    grouped.get(normalized.sectionTitle).push(normalized.item);
  }

  const sections = sortSections(
    Array.from(grouped.entries()).map(([title, items]) => ({
      id: slugify(title),
      title,
      items: sortItems(items)
    }))
  );

  const output = {
    generatedFrom: "orcid",
    orcid: ORCID_ID,
    orcidUrl: ORCID_URL,
    lastUpdated: formatDate(),
    sourceNote: "This list is generated from the public ORCID record for Jose Rodolfo Chreim.",
    automationSuggestions: [
      "This file is auto-generated from ORCID by scripts/update-publications-from-orcid.mjs.",
      "Run the script locally with network access or let the GitHub Action refresh it on schedule.",
      "If a work is missing or misclassified, update the ORCID record first so the site can stay in sync."
    ],
    sections
  };

  const fileContents = `window.publicationsData = ${JSON.stringify(output, null, 2)};\n`;
  await fs.writeFile(OUTPUT_PATH, fileContents, "utf8");

  console.log(`Updated ${path.basename(OUTPUT_PATH)} from ${ORCID_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
