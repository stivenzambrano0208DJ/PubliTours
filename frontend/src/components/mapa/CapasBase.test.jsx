import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapContainer } from "react-leaflet";
import CapasBase from "./CapasBase";

const CLAVE = "publitours_capa_mapa";
const montar = () =>
  render(
    <MapContainer center={[1.6, -75.6]} zoom={9} style={{ height: 300, width: 300 }}>
      <CapasBase />
    </MapContainer>
  );
const tilesActuales = () => [...document.querySelectorAll(".leaflet-tile-pane img.leaflet-tile")].map((i) => i.getAttribute("src"));
const hosts = () => [...new Set(tilesActuales().map((s) => new URL(s).hostname.replace(/^[abc]\./, "")))];

describe("CapasBase", () => {
  beforeEach(() => localStorage.clear());

  it("ofrece Calles, Satélite e Híbrido y abre en Calles por defecto", () => {
    montar();
    for (const nombre of ["Calles", "Satélite", "Híbrido"]) expect(screen.getByLabelText(nombre)).toBeInTheDocument();
    expect(screen.getByLabelText("Calles")).toBeChecked();
    expect(hosts()).toEqual(["tile.openstreetmap.org"]);
  });

  it("Satélite muestra solo imágenes reales del terreno", async () => {
    montar();
    await userEvent.click(screen.getByLabelText("Satélite"));
    expect(hosts()).toEqual(["server.arcgisonline.com"]);
    expect(tilesActuales().every((s) => s.includes("World_Imagery"))).toBe(true);
  });

  it("Híbrido suma al satélite las carreteras y los nombres de lugares", async () => {
    montar();
    await userEvent.click(screen.getByLabelText("Híbrido"));
    const urls = tilesActuales().join(" ");
    expect(urls).toContain("World_Imagery");
    expect(urls).toContain("World_Transportation");
    expect(urls).toContain("World_Boundaries_and_Places");
  });

  it("recuerda la capa elegida para los demás mapas", async () => {
    montar();
    await userEvent.click(screen.getByLabelText("Satélite"));
    expect(localStorage.getItem(CLAVE)).toBe("Satélite");
  });

  it("al abrir otro mapa usa la capa guardada", () => {
    localStorage.setItem(CLAVE, "Satélite");
    montar();
    expect(screen.getByLabelText("Satélite")).toBeChecked();
    expect(hosts()).toEqual(["server.arcgisonline.com"]);
  });

  it("ignora un valor guardado inválido", () => {
    localStorage.setItem(CLAVE, "capa-inexistente");
    montar();
    expect(screen.getByLabelText("Calles")).toBeChecked();
  });
});
