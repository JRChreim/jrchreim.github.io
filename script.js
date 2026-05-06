document.getElementById("year").textContent = new Date().getFullYear();

const currentPath = window.location.pathname.replace(/index\.html$/, "");

document.querySelectorAll(".nav a").forEach((link) => {
  const linkPath = new URL(link.href).pathname.replace(/index\.html$/, "");
  if (linkPath === currentPath) {
    link.classList.add("is-active");
  }
});

const publicationsRoot = document.getElementById("publications-sections");
const publicationsNote = document.getElementById("publications-source-note");
const publicationsAutomationList = document.getElementById("publications-automation-list");

function mergePublicationSources(primaryData, manualData) {
  const baseSections = [...(primaryData.sections || [])].map((section) => ({
    ...section,
    items: [...(section.items || [])]
  }));
  const sectionMap = new Map(baseSections.map((section) => [section.title, section]));

  (manualData.sections || []).forEach((section) => {
    if (!sectionMap.has(section.title)) {
      sectionMap.set(section.title, {
        ...section,
        items: [...(section.items || [])]
      });
      return;
    }

    const existing = sectionMap.get(section.title);
    existing.items.push(...(section.items || []));
  });

  return {
    ...primaryData,
    sections: Array.from(sectionMap.values())
  };
}

if (publicationsRoot && window.publicationsData) {
  const primaryData = window.publicationsData;
  const manualData = window.publicationsManualData || { sections: [] };
  const mergedData = mergePublicationSources(primaryData, manualData);
  const { sections, sourceNote, automationSuggestions, lastUpdated } = mergedData;

  if (publicationsNote) {
    const manualNote = manualData.sourceNote ? ` ${manualData.sourceNote}` : "";
    publicationsNote.textContent = `${sourceNote}${manualNote} Last updated: ${lastUpdated}.`;
  }

  if (publicationsAutomationList) {
    automationSuggestions.forEach((suggestion) => {
      const item = document.createElement("li");
      item.textContent = suggestion;
      publicationsAutomationList.appendChild(item);
    });
  }

  sections.forEach((section) => {
    const sectionElement = document.createElement("section");
    sectionElement.className = "publication-section";

    const heading = document.createElement("h3");
    heading.textContent = section.title;
    sectionElement.appendChild(heading);

    const list = document.createElement("div");
    list.className = "contact-list";

    section.items.forEach((publication) => {
      const entry = document.createElement("article");
      entry.className = "contact-item publication-entry";

      const title = document.createElement("strong");
      if (publication.href) {
        const link = document.createElement("a");
        link.href = publication.href;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = publication.title;
        title.appendChild(link);
      } else {
        title.textContent = publication.title;
      }
      entry.appendChild(title);

      const authors = document.createElement("span");
      authors.className = "publication-authors";
      authors.textContent = publication.authors;
      entry.appendChild(authors);

      const venue = document.createElement("span");
      venue.className = "publication-meta";
      venue.textContent = `${publication.venue} (${publication.year})`;
      entry.appendChild(venue);

      if (publication.note) {
        const note = document.createElement("span");
        note.className = "publication-note";
        note.textContent = publication.note;
        entry.appendChild(note);
      }

      list.appendChild(entry);
    });

    sectionElement.appendChild(list);
    publicationsRoot.appendChild(sectionElement);
  });
}
