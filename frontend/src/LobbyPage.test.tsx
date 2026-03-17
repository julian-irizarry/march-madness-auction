import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";

import LobbyPage from "./LobbyPage";

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = jest.fn();
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

describe("LobbyPage", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
  });

  beforeEach(() => {
    MockWebSocket.instances = [];
    mockNavigate.mockReset();
    mockUseLocation.mockReturnValue({
      state: {
        gameId: "ROOM42",
        isCreator: true,
        playerName: "Ryan",
      },
    });
  });

  it("renders roster updates from the lobby websocket and lets the creator start the game", () => {
    render(<LobbyPage />);

    expect(MockWebSocket.instances[0].url).toContain("/ws/ROOM42");

    act(() => {
      MockWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ players: { Ryan: {}, Alex: {} } }),
      });
    });

    expect(screen.getByText("Ryan")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start game/i }));
    expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith("startGame");
  });

  it("shows the waiting state for participants and navigates when the game starts", () => {
    mockUseLocation.mockReturnValue({
      state: {
        gameId: "ROOM42",
        isCreator: false,
        playerName: "Maya",
      },
    });

    render(<LobbyPage />);

    expect(screen.queryByRole("button", { name: /start game/i })).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for the host to start the game/i)).toBeInTheDocument();

    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: "gameStarted" });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/game", {
      state: { gameId: "ROOM42", isCreator: false, playerName: "Maya" },
    });
  });
});
