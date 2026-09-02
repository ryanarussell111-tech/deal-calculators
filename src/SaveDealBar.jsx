import { useState } from "react";
import { saveDeal } from "./dealStorage";
import { Button, TextField } from "./calcUI";

/**
 * The save row shared by every calculator. Owns the name prompt, the
 * create-vs-update decision, and the result message, so no calculator repeats
 * that logic and all four behave identically.
 *
 * @param {string} props.calculatorType  key from calculatorTypes.js
 * @param {object} props.inputs          the calculator's raw inputs, saved verbatim
 * @param {object} props.summary         headline figures for the saved-deals list
 * @param {object} [props.loadedDeal]    the deal this calculator was opened from
 * @param {function} [props.onSaved]     called with the stored record
 */
export default function SaveDealBar({ calculatorType, inputs, summary, loadedDeal, onSaved }) {
  const [dealName, setDealName] = useState(loadedDeal ? loadedDeal.name : "");
  const [dealId, setDealId] = useState(loadedDeal ? loadedDeal.id : null);
  const [saveState, setSaveState] = useState(null); // {kind: "ok"|"error", message}
  const [namePrompted, setNamePrompted] = useState(false);

  async function handleSave() {
    // Ask for a name before the first save rather than storing "Untitled".
    if (!dealName.trim()) {
      setNamePrompted(true);
      setSaveState({ kind: "error", message: "Give this deal a name first — an address or nickname." });
      return;
    }
    try {
      const saved = await saveDeal({
        id: dealId || undefined,
        name: dealName,
        calculatorType,
        inputs,
        summary,
      });
      setDealId(saved.id);
      setSaveState({ kind: "ok", message: "Saved “" + saved.name + "”" });
      if (onSaved) onSaved(saved);
    } catch (err) {
      setSaveState({ kind: "error", message: err.message || "Could not save this deal" });
    }
  }

  const showNameField = namePrompted || !!dealName || !!dealId;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        {showNameField && (
          <TextField
            label="Deal Name"
            value={dealName}
            onChange={function (v) { setDealName(v); if (saveState) setSaveState(null); }}
            placeholder="e.g. 412 Oak St"
            onKeyDown={function (e) { if (e.key === "Enter") handleSave(); }}
          />
        )}
        <Button onClick={handleSave} color="#00ff88">
          {dealId ? "💾 Update Saved Deal" : "💾 Save Deal"}
        </Button>
        {dealId && <span style={{ fontSize: 10, color: "#555" }}>Editing a saved deal</span>}
      </div>
      {saveState && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: saveState.kind === "ok" ? "#00ff88" : "#f87171" }}>
          {saveState.message}
        </div>
      )}
    </div>
  );
}
