import { Component } from "react";

/** Catches crashes while rendering so one bad component doesn't blank the whole page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Render crash:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="backdrop">
        <div className="dialog" role="alert">
          <h2>Something went wrong drawing this view</h2>
          <p className="error">{String(this.state.error.message || this.state.error)}</p>
          <button className="btn" onClick={this.props.onClose}>Close</button>
        </div>
      </div>
    );
  }
}