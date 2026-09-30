import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Link } from '../../shell/router';
import type { Agent } from '../../types';

/**
 * Every agent, to pick the one whose prompt to work on.
 *
 * Agents are not created here: one is useful only once code resolves its key
 * (today, `guest`), so adding one is a code change and a migration, not a
 * button (work/0016).
 */
export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .agents()
      .then(({ agents: list }) => setAgents(list))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'משהו השתבש'));
  }, []);

  return (
    <div className="page">
      <header className="head">
        <h1>סוכנים</h1>
      </header>
      <div className="page-body">
        {error && <p className="notice error">{error}</p>}
        {!agents && !error && <p className="hint">טוען…</p>}
        {agents && agents.length === 0 && <p className="hint">אין סוכנים.</p>}
        {agents && agents.length > 0 && (
          <ul className="card user-list agent-list">
            {agents.map((agent) => (
              <li key={agent.id}>
                <Link to={`/agents/${encodeURIComponent(agent.key)}`} className="user-row agent-row">
                  <span className="user-main">
                    <span className="user-email" dir="auto">
                      {agent.name}
                    </span>
                    <span className="hint" dir="ltr">
                      {agent.key}
                    </span>
                  </span>
                  <span className="hint" aria-hidden="true">
                    ‹
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
