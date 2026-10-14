import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Estrellas, SelectorEstrellas } from "./Estrellas";

describe("Estrellas", () => {
  it("muestra siempre cinco estrellas y la calificación accesible", () => {
    const { container } = render(<Estrellas valor={3.5} />);
    expect(container.querySelectorAll(".material-symbols-outlined")).toHaveLength(5);
    expect(screen.getByLabelText("3.5 de 5")).toBeInTheDocument();
  });

  it("marca media estrella con valores decimales", () => {
    const { container } = render(<Estrellas valor={2.5} />);
    const iconos = [...container.querySelectorAll(".material-symbols-outlined")].map((e) => e.textContent);
    expect(iconos).toEqual(["star", "star", "star_half", "star", "star"]);
  });
});

describe("SelectorEstrellas", () => {
  it("entrega la calificación elegida", async () => {
    const onChange = vi.fn();
    render(<SelectorEstrellas valor={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("marca como seleccionada solo la estrella actual", () => {
    render(<SelectorEstrellas valor={2} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "5 estrellas" })).toHaveAttribute("aria-checked", "false");
  });
});
