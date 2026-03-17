import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import HomePage from "./HomePage";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

class MockAudio {
  loop = false;
  volume = 1;
  muted = false;
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

describe("HomePage", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      writable: true,
      value: MockAudio,
    });
  });

  beforeEach(() => {
    mockNavigate.mockReset();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("shows the correct overlay fields for create, join, and view flows", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /create game/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/game id/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    fireEvent.click(screen.getByRole("button", { name: /view game/i }));
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
  });

  it("creates a game and navigates to the lobby with the returned id", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ROOM42" }),
    });

    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /create game/i }));
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Ryan" } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("http://127.0.0.1:8000/create-game/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ player: "Ryan" }),
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/lobby", {
      state: { gameId: "ROOM42", isCreator: true, playerName: "Ryan" },
    });
  });

  it("renders join errors returned by the backend", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Game ID not found" }),
    });

    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /join game/i }));
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Ryan" } });
    fireEvent.change(screen.getByLabelText(/game id/i), { target: { value: "BAD123" } });
    fireEvent.click(screen.getByRole("button", { name: /^join$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Game ID not found");
    });
  });
});
