import { useMemo, useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import type { NoteItem } from "../../types";

function createNote(): NoteItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    content: "新的小便签",
    createdAt: now,
    updatedAt: now,
    pinned: false
  };
}

export function NotesPanel() {
  const { data, loading, patch } = useAppData();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const sortedNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...(data?.notes ?? [])]
      .filter((note) => (normalizedQuery ? note.content.toLowerCase().includes(normalizedQuery) : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [data?.notes, query]);

  const pinnedCount = data?.notes.filter((note) => note.pinned).length ?? 0;

  if (loading || !data) return <div className="empty-state">一二正在翻便签本...</div>;

  const addNote = () => {
    void patch((current) => ({
      ...current,
      notes: [{ ...createNote(), content: draft.trim() || "新的小便签" }, ...current.notes]
    }));
    void window.bubu.setPetMood({ mood: "note", bubble: "便签记好啦。", durationMs: 4_200 });
    setDraft("");
  };

  const updateNote = (id: string, content: string) => {
    void patch((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
      )
    }));
  };

  const togglePinned = (id: string) => {
    void patch((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note))
    }));
    void window.bubu.setPetMood({ mood: "note", bubble: "便签位置调整好啦。", durationMs: 3_200 });
  };

  const deleteNote = (id: string) => {
    void patch((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
  };

  const pinToDesktop = (id: string) => {
    void patch((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === id ? { ...note, pinned: true, updatedAt: new Date().toISOString() } : note
      )
    }));
    void window.bubu.openNoteWidget(id);
    void window.bubu.setPetMood({ mood: "note", bubble: "便签贴到桌面啦。", durationMs: 0 });
  };

  return (
    <div className="stack">
      <div className="composer">
        <div className="panel-toolbar">
          <label className="search-field">
            <span>搜索便签</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词"
            />
          </label>
          <span className="count-pill">
            {data.notes.length} 条 / {pinnedCount} 置顶
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="写点想记住的小事..."
          rows={3}
        />
        <button className="primary-button" type="button" onClick={addNote}>
          新增便签
        </button>
      </div>
      <div className="note-list">
        {sortedNotes.length === 0 ? (
          <div className="empty-state">{query.trim() ? "没有找到匹配的便签。" : "还没有便签，先写下一件小事吧。"}</div>
        ) : null}
        {sortedNotes.map((note) => (
          <article className={`note-card ${note.pinned ? "is-pinned" : ""}`} key={note.id}>
            <textarea value={note.content} onChange={(event) => updateNote(note.id, event.target.value)} rows={4} />
            <footer>
              <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</time>
              <button type="button" onClick={() => togglePinned(note.id)}>
                {note.pinned ? "取消置顶" : "置顶"}
              </button>
              <button type="button" onClick={() => pinToDesktop(note.id)}>
                贴桌面
              </button>
              <button type="button" onClick={() => deleteNote(note.id)}>
                删除
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
