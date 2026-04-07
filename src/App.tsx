import { useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "./supabaseClient";
import "./index.css";

const MAX_CHARS = 600;

const CATEGORY_OPTIONS = [
  { value: "crushes", emoji: "😍", label: "Crushes" },
  { value: "apuntes", emoji: "📚", label: "Apuntes" },
  { value: "fiestas", emoji: "🎉", label: "Fiestas" },
  { value: "pisos", emoji: "🏠", label: "Pisos" },
  { value: "actividades", emoji: "📆", label: "Actividades" },
  { value: "market", emoji: "🛒", label: "Mercado" },
  { value: "eventos", emoji: "🏟️", label: "Eventos" },
] as const;

type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"];

export default function App() {
  const particles = useMemo(() => Array.from({ length: 24 }), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CategoryValue>("crushes");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [blockedMsg, setBlockedMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmClosing, setConfirmClosing] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successClosing, setSuccessClosing] = useState(false);
  const [posting, setPosting] = useState(false);

  const overLimit = body.length > MAX_CHARS;

  function openConfirm() {
    const cleanBody = body.trim();

    if (!cleanBody) {
      setBlockedMsg("Escribe algo antes de publicar.");
      return;
    }

    if (cleanBody.length > MAX_CHARS) {
      setBlockedMsg(`Máximo ${MAX_CHARS} caracteres.`);
      return;
    }

    setBlockedMsg("");
    setConfirmClosing(false);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmClosing(true);
    window.setTimeout(() => {
      setConfirmOpen(false);
      setConfirmClosing(false);
    }, 180);
  }

  function closeSuccess() {
    setSuccessClosing(true);
    window.setTimeout(() => {
      setSuccessOpen(false);
      setSuccessClosing(false);
    }, 180);
  }

  function handlePickFile(nextFile?: File | null) {
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      setBlockedMsg("Solo se permiten imágenes.");
      return;
    }

    setBlockedMsg("");
    setFile(nextFile);
  }

  async function publishHylo() {
    const cleanBody = body.trim();
    const cleanName = name.trim();

    if (!cleanBody) {
      setBlockedMsg("Escribe algo antes de publicar.");
      closeConfirm();
      return;
    }

    if (cleanBody.length > MAX_CHARS) {
      setBlockedMsg(`Máximo ${MAX_CHARS} caracteres.`);
      closeConfirm();
      return;
    }

    setPosting(true);

    try {
      let imageUrl: string | null = null;

      if (file) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `panel-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("panel-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("UPLOAD ERROR:", uploadError);
          alert(`UPLOAD ERROR: ${uploadError.message}`);
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("panel-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        name: isAnonymous ? "" : cleanName || "Usuario",
        body: cleanBody,
        category,
        is_anonymous: isAnonymous,
        image_url: imageUrl,
      };

      console.log("PAYLOAD A INSERTAR:", payload);
      console.log("INSERTANDO EN PANEL_POSTS...");

      const { data, error } = await supabase
        .from("panel_posts")
        .insert([payload])
        .select();

      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);

      if (error) {
        alert(`INSERT ERROR: ${error.message}`);
        throw error;
      }

      closeConfirm();

      setName("");
      setBody("");
      setCategory("crushes");
      setIsAnonymous(false);
      setFile(null);
      setBlockedMsg("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessClosing(false);
      setSuccessOpen(true);
    } catch (error: any) {
      console.error("PUBLISH HYLO ERROR:", error);
      alert(`PUBLISH HYLO ERROR: ${error?.message || "Error desconocido"}`);
      closeConfirm();
      setBlockedMsg("No se pudo publicar el hylo.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="page">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="particles" aria-hidden="true">
        {particles.map((_, i) => (
          <span
            key={i}
            className={`particle particle-${(i % 6) + 1}`}
            style={
              {
                "--left": `${4 + ((i * 11) % 88)}%`,
                "--size": `${4 + (i % 4) * 2}px`,
                "--delay": `${(i % 7) * 0.8}s`,
                "--duration": `${8 + (i % 5)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <main className="shell">
        <img
          className="hylo-logo"
          src="/hylo_logo.png"
          alt="Hylo"
          style={{
            height: "auto",
            display: "block",
            position: "relative",
            top: "2px",
          }}
        />

        <section className="panel">
          <h1 className="title">Publicar hylo</h1>

          <div className="field-block">
            <input
              id="name"
              className="name-input"
              type="text"
              placeholder="Tu nombre"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnonymous || posting}
            />
          </div>

          <div className="textarea-wrap">
            <textarea
              placeholder="Escribe tu hylo..."
              maxLength={MAX_CHARS + 200}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (blockedMsg) setBlockedMsg("");
              }}
              disabled={posting}
              style={{
                borderColor: overLimit ? "rgba(255,90,90,0.45)" : undefined,
              }}
            />
            <div className="counter">
              <span className={overLimit ? "counter-over" : ""}>
                {body.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {blockedMsg ? <div className="error-box">{blockedMsg}</div> : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const nextFile = e.target.files?.[0] ?? null;
              handlePickFile(nextFile);
              e.currentTarget.value = "";
            }}
            disabled={posting}
          />

          <div className="image-upload-block">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={posting}
            >
              Subir imagen
            </button>

            {file ? (
              <div className="file-pill" style={{ marginLeft: 12 }}>
                <span className="file-pill-text">Imagen</span>
                <button
                  type="button"
                  className="file-pill-remove"
                  onClick={() => setFile(null)}
                  aria-label="Quitar imagen"
                  disabled={posting}
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>

          <div className="select-wrap">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryValue)}
              disabled={posting}
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>

            <span className="chevron" aria-hidden="true">
              <svg
                width="16"
                height="10"
                viewBox="0 0 16 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 2.25L8 7.25L14 2.25"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => {
                setIsAnonymous(e.target.checked);
                if (e.target.checked) setName("");
              }}
              disabled={posting}
            />
            <span className="custom-check" />
            <span className="check-label">Anónimo</span>
          </label>

          <button
            className="publish-btn"
            type="button"
            onClick={openConfirm}
            disabled={!body.trim() || overLimit || posting}
          >
            Publicar
          </button>
        </section>
      </main>

      {confirmOpen && (
        <div
          className={`hylo-modal-backdrop ${confirmClosing ? "is-closing" : ""}`}
          onClick={closeConfirm}
        >
          <div
            className={`hylo-modal hylo-confirm ${confirmClosing ? "is-closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hylo-modal-title" style={{ marginBottom: 10 }}>
              Confirmación
            </div>

            <p className="hylo-confirm-text">
              Al publicar confirmas que no estás compartiendo contenido sensible,
              ilegal, ni información personal de terceros.
            </p>

            <div className="hylo-confirm-actions">
              <button
                className="hylo-btn"
                type="button"
                onClick={closeConfirm}
                disabled={posting}
              >
                Cancelar
              </button>

              <button
                className="hylo-btn hylo-btn-primary"
                type="button"
                onClick={publishHylo}
                disabled={posting}
              >
                {posting ? "Publicando…" : "Acepto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successOpen && (
        <div
          className={`hylo-modal-backdrop ${successClosing ? "is-closing" : ""}`}
          onClick={closeSuccess}
        >
          <div
            className={`hylo-modal hylo-confirm ${successClosing ? "is-closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hylo-modal-title" style={{ marginBottom: 10 }}>
              Hylo enviado
            </div>

            <p className="hylo-confirm-text">
              Tu hylo se ha enviado correctamente.
            </p>

            <div className="hylo-confirm-actions">
              <button
                className="hylo-btn hylo-btn-primary"
                type="button"
                onClick={closeSuccess}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}