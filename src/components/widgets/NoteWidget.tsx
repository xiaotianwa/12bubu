import { useMemo } from "react";
import { useAppData } from "../../hooks/useAppData";

export function NoteWidget({ noteId }: { noteId: string }) {
  const { data, loading, patch } = useAppData();
  const note = useMemo(() => data?.notes.find((item) => item.id === noteId) ?? null, [data?.notes, noteId]);

  const updateNote = (content: string) => {
    void patch((current) => ({
      ...current,
      notes: current.notes.map((item) =>
        item.id === noteId ? { ...item, content, updatedAt: new Date().toISOString(), pinned: true } : item
      )
    }));
    void window.bubu.setPetMood({ mood: "note", bubble: "便签正在桌面上。", durationMs: 0 });
  };

  if (loading) return <main className="widget-window note-widget app-drag">一二正在翻便签...</main>;

  if (!note) {
    return (
      <main className="widget-window note-widget app-drag">
        <header>
          <strong>便签不见了</strong>
          <button className="widget-close no-drag" type="button" onClick={() => window.bubu.closeNoteWidget(noteId)}>
            x
          </button>
        </header>
        <p>这张便签可能已经被删除。</p>
      </main>
    );
  }

  return (
    <main className="widget-window note-widget app-drag" aria-label="桌面便签">
      <header>
        <span>一二便签</span>
        <button className="widget-close no-drag" type="button" onClick={() => window.bubu.closeNoteWidget(noteId)}>
          x
        </button>
      </header>
      <textarea
        className="no-drag"
        value={note.content}
        onChange={(event) => updateNote(event.target.value)}
        aria-label="便签内容"
      />
      <footer>
        <span>已贴桌面</span>
        <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time>
      </footer>
    </main>
  );
}
