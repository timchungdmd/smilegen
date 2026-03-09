import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary that catches render errors in its subtree.
 *
 * Wrap any view or heavy component (e.g. SceneCanvas) with this to prevent
 * a white-screen crash from propagating to the whole application.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(
      `[ErrorBoundary:${this.props.label ?? "unknown"}]`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 12,
            color: "#e55",
            fontFamily: "monospace",
            fontSize: 13
          }}
        >
          <div>Something went wrong in {this.props.label ?? "this section"}</div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              maxWidth: 400,
              textAlign: "center"
            }}
          >
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 8, padding: "6px 16px", cursor: "pointer" }}
          >
            Try to recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
