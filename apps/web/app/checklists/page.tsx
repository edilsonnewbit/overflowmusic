"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { AuthRequired } from "@/components/AuthRequired";
import type { ChecklistTemplate, ChecklistRunItem, ChecklistRun } from "@/lib/types";

type ApiResult<T> = {
  ok: boolean;
  message?: string;
} & T;

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://music.overflowmvmt.com/api";

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }
  return body;
}

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [eventId, setEventId] = useState("");
  const [activeChecklist, setActiveChecklist] = useState<ChecklistRun | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateItemsText, setTemplateItemsText] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState("");
  const [checkedByName, setCheckedByName] = useState("Web Admin");
  const [status, setStatus] = useState("Ready");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const sortedItems = useMemo(
    () => [...(activeChecklist?.items || [])].sort((a, b) => a.order - b.order),
    [activeChecklist],
  );

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/checklists/templates", { method: "GET" });
      const body = await parseJson<{ templates: ChecklistTemplate[] }>(response);
      setTemplates(body.templates || []);
      setStatus("Templates loaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = templateName.trim();
    const items = templateItemsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!name || items.length === 0) {
      setStatus("Fill template name and at least one item");
      return;
    }

    try {
      const response = await fetch("/api/checklists/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items }),
      });

      await parseJson<{ template: ChecklistTemplate }>(response);
      setTemplateName("");
      setTemplateItemsText("");
      await loadTemplates();
      setStatus("Template created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create template");
    }
  }

  async function removeTemplate(templateId: string) {
    try {
      const response = await fetch(`/api/checklists/templates/${templateId}`, { method: "DELETE" });
      await parseJson<Record<string, never>>(response);
      await loadTemplates();
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId("");
      }
      setStatus("Template removed");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to remove template");
    }
  }

  async function loadEventChecklist() {
    const cleanEventId = eventId.trim();
    if (!cleanEventId) {
      setStatus("Inform an event ID first");
      return;
    }

    setLoadingChecklist(true);
    try {
      const response = await fetch(`/api/events/${cleanEventId}/checklist`, { method: "GET" });
      const body = await parseJson<{ checklist: ChecklistRun | null }>(response);
      setActiveChecklist(body.checklist || null);
      setStatus(body.checklist ? "Checklist loaded" : "No checklist yet for this event");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load checklist");
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function applyTemplateToEvent() {
    const cleanEventId = eventId.trim();
    if (!cleanEventId || !selectedTemplateId) {
      setStatus("Select event and template");
      return;
    }

    try {
      const response = await fetch(`/api/events/${cleanEventId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      const body = await parseJson<{ checklist: ChecklistRun }>(response);
      setActiveChecklist(body.checklist);
      setStatus("Checklist created from template");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to apply template");
    }
  }

  async function createChecklistFromText() {
    const cleanEventId = eventId.trim();
    const items = newChecklistItems
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((label) => ({ label, checked: false }));

    if (!cleanEventId || items.length === 0) {
      setStatus("Inform event and custom checklist items");
      return;
    }

    try {
      const response = await fetch(`/api/events/${cleanEventId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await parseJson<{ checklist: ChecklistRun }>(response);
      setActiveChecklist(body.checklist);
      setStatus("Checklist created from custom list");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create custom checklist");
    }
  }

  async function toggleChecklistItem(item: ChecklistRunItem) {
    if (!eventId.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId.trim()}/checklist/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checked: !item.checked,
          checkedByName: checkedByName.trim() || "Web Admin",
        }),
      });
      const body = await parseJson<{ items?: ChecklistRunItem[]; item?: ChecklistRunItem }>(response);

      if (Array.isArray(body.items)) {
        setActiveChecklist((prev) => (prev ? { ...prev, items: body.items as ChecklistRunItem[] } : prev));
      } else if (body.item) {
        setActiveChecklist((prev) => {
          if (!prev) return prev;
          const items = prev.items.map((entry) => (entry.id === body.item?.id ? (body.item as ChecklistRunItem) : entry));
          return { ...prev, items };
        });
      }

      setStatus("Checklist item updated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update checklist item");
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 36px" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto" }}>
        <AuthRequired>
          <header style={headerStyle}>
            <p style={tagStyle}>Operations</p>
            <h1 style={{ margin: "8px 0 12px", fontSize: 36, lineHeight: 1.1 }}>Checklist Management</h1>
            <p style={{ margin: 0, color: "#d6e5f8" }}>
              API target: <code>{apiUrl}</code>
            </p>
            <p style={{ margin: "8px 0 0", color: "#1ecad3" }}>{status}</p>
            <p style={{ margin: "10px 0 0" }}>
              <Link href="/" style={linkStyle}>
                Voltar ao Hub
              </Link>
            </p>
          </header>

          <section style={gridStyle}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Checklist Templates</h2>
              <form onSubmit={createTemplate} style={{ display: "grid", gap: 10 }}>
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Template name"
                  style={inputStyle}
                />
                <textarea
                  value={templateItemsText}
                  onChange={(event) => setTemplateItemsText(event.target.value)}
                  placeholder={"One item per line\nMic check\nBatteries\nSong sheets"}
                  rows={6}
                  style={inputStyle}
                />
                <button type="submit" style={primaryButtonStyle}>
                  Create Template
                </button>
              </form>

              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 8px", color: "#b3c6e0" }}>
                  Existing templates {loadingTemplates ? "(loading...)" : `(${templates.length})`}
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  {templates.map((template) => (
                    <div key={template.id} style={innerCardStyle}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{template.name}</p>
                      <p style={{ margin: "6px 0 10px", color: "#b3c6e0", fontSize: 14 }}>{template.items.length} items</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" style={secondaryButtonStyle} onClick={() => setSelectedTemplateId(template.id)}>
                          Select
                        </button>
                        <button type="button" style={dangerButtonStyle} onClick={() => void removeTemplate(template.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 ? <p style={{ margin: 0, color: "#b3c6e0" }}>No templates yet.</p> : null}
                </div>
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Event Checklist</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <input value={eventId} onChange={(event) => setEventId(event.target.value)} placeholder="Event ID" style={inputStyle} />
                <input
                  value={checkedByName}
                  onChange={(event) => setCheckedByName(event.target.value)}
                  placeholder="Checked by"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => void loadEventChecklist()}>
                    {loadingChecklist ? "Loading..." : "Load Checklist"}
                  </button>
                  <button type="button" style={primaryButtonStyle} onClick={() => void applyTemplateToEvent()}>
                    Apply Selected Template
                  </button>
                </div>

                <textarea
                  value={newChecklistItems}
                  onChange={(event) => setNewChecklistItems(event.target.value)}
                  placeholder={"Or create custom checklist\nOne item per line"}
                  rows={4}
                  style={inputStyle}
                />
                <button type="button" style={secondaryButtonStyle} onClick={() => void createChecklistFromText()}>
                  Create Custom Checklist
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 8px", color: "#b3c6e0" }}>
                  {activeChecklist ? `Checklist ID: ${activeChecklist.id}` : "Checklist not loaded"}
                </p>

                <div style={{ display: "grid", gap: 8 }}>
                  {sortedItems.map((item) => (
                    <button type="button" key={item.id} onClick={() => void toggleChecklistItem(item)} style={itemStyle(item.checked)}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{item.checked ? "Done" : "Pending"} - {item.label}</p>
                      <p style={{ margin: "4px 0 0", color: "#b3c6e0", fontSize: 13 }}>
                        {item.checkedByName ? `By ${item.checkedByName}` : "Not assigned"}
                      </p>
                    </button>
                  ))}
                  {sortedItems.length === 0 ? <p style={{ margin: 0, color: "#b3c6e0" }}>No checklist items.</p> : null}
                </div>
              </div>
            </article>
          </section>
        </AuthRequired>
      </section>
    </main>
  );
}

const headerStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 55%, #0f2137 100%)",
  border: "1px solid #31557c",
  borderRadius: 24,
  padding: 24,
  marginBottom: 20,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
  gap: 16,
  alignItems: "start",
};

const cardStyle: CSSProperties = {
  background: "rgba(18, 40, 64, 0.85)",
  border: "1px solid #2d4b6d",
  borderRadius: 18,
  padding: 18,
};

const innerCardStyle: CSSProperties = {
  background: "rgba(13, 30, 49, 0.9)",
  border: "1px solid #28496b",
  borderRadius: 14,
  padding: 12,
};

const tagStyle: CSSProperties = {
  margin: 0,
  letterSpacing: 2.4,
  textTransform: "uppercase",
  color: "#7cf2a2",
  fontSize: 12,
};

const linkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "underline",
};

const inputStyle: CSSProperties = {
  background: "rgba(6, 18, 29, 0.85)",
  border: "1px solid #31557c",
  color: "#f4f8ff",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  background: "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
  color: "#061420",
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#163453",
  color: "#ecf5ff",
  border: "1px solid #31557c",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "#4a1f29",
  color: "#ffd8dd",
  border: "1px solid #80414c",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

const itemStyle = (checked: boolean): CSSProperties => ({
  border: `1px solid ${checked ? "#2fb57f" : "#31557c"}`,
  background: checked ? "rgba(47, 181, 127, 0.18)" : "rgba(9, 25, 40, 0.88)",
  borderRadius: 12,
  color: "inherit",
  textAlign: "left",
  padding: "10px 12px",
  cursor: "pointer",
});
