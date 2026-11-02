import { useEffect, useState } from "react";
import { Music2, Pencil, Trash2 } from "lucide-react";
import { youtubeVideoId } from "../services/youtube";

export default function StudyMusic({ url, onChange }: { url: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(url);
  const [editing, setEditing] = useState(!url);
  const [playRequest, setPlayRequest] = useState<{ id: string; count: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { setDraft(url); setEditing(!url); }, [url]);
  const id = youtubeVideoId(url);
  return <section className="panel study-music">
    <div className="panel-heading"><div><h2><Music2 size={18} /> Study soundtrack</h2><p>Add a YouTube video for lofi, ambience, or music.</p></div>
      {url && <div className="study-music-actions"><button type="button" className="icon-button" aria-label="Edit study video" onClick={() => { setDraft(url); setEditing(true); }}><Pencil size={15} /></button><button type="button" className="icon-button" aria-label="Remove study video" onClick={() => { onChange(""); setError(""); }}><Trash2 size={15} /></button></div>}
    </div>
    {editing && <form className="study-music-form" onSubmit={(event) => {
      event.preventDefault(); const videoId = youtubeVideoId(draft.trim());
      if (!videoId) { setError("Paste a valid YouTube video or livestream link."); return; }
      onChange(`https://www.youtube.com/watch?v=${videoId}`); setPlayRequest((current) => ({ id: videoId, count: (current?.count || 0) + 1 })); setEditing(false); setError("");
    }}>
      <input type="url" required aria-label="YouTube video link" placeholder="Paste a YouTube link" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="submit" className="primary small">Play video</button>
      {url && <button type="button" className="secondary small" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>}
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
    {id && <div className="study-music-player"><iframe key={`${id}:${playRequest?.count || 0}`} title="Study music YouTube player" src={`https://www.youtube-nocookie.com/embed/${id}${playRequest?.id === id ? "?autoplay=1" : ""}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>}
    {id && <p className="helper">If playback does not start, press play in the video. If the creator blocks embedding, <a href={url} target="_blank" rel="noreferrer">open on YouTube</a>.</p>}
  </section>;
}
