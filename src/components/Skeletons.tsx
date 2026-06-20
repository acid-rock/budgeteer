// Loading skeletons for the client-fetched pages (Budgets, Reports, Categories,
// Transactions). Each mirrors its page's real layout so swapping in the data
// doesn't shift anything. The shimmer comes from .mint-skel in globals.css; the
// dashboard keeps its own Suspense fallbacks inline.

// Three summary cards, matching the .mint-stats row. The featured (dark) card
// needs a translucent-white bar so the skeleton stays visible on green.
function StatsSkeleton() {
  return (
    <div className="mint-stats">
      {[0, 1, 2].map((i) => {
        const onFeat = i === 2 ? { background: "rgba(255,255,255,0.25)" } : {};
        return (
          <div key={i} className={"mint-stat" + (i === 2 ? " feat" : "")}>
            <span
              className="mint-skel"
              style={{ height: 13, width: "45%", marginBottom: 12, ...onFeat }}
            />
            <span
              className="mint-skel"
              style={{ height: 30, width: "65%", ...onFeat }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function BudgetsSkeleton() {
  return (
    <>
      <StatsSkeleton />
      <div className="mint-panel">
        <div className="mint-ph">
          <span className="mint-skel" style={{ height: 16, width: 140 }} />
          <span className="mint-skel" style={{ height: 13, width: 90 }} />
        </div>
        <div className="mint-budget">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span className="mint-skel" style={{ height: 14, width: 130 }} />
                <span className="mint-skel" style={{ height: 14, width: 96 }} />
              </div>
              <span
                className="mint-skel"
                style={{ height: 10, width: "100%", borderRadius: 6 }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function ReportSkeleton() {
  return (
    <>
      <StatsSkeleton />
      <div className="mint-grid split">
        <div className="mint-panel">
          <div className="mint-ph">
            <span className="mint-skel" style={{ height: 16, width: 110 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
            <span
              className="mint-skel"
              style={{ width: 180, height: 180, borderRadius: "50%" }}
            />
          </div>
        </div>
        <div className="mint-panel">
          <div className="mint-ph">
            <span className="mint-skel" style={{ height: 16, width: 110 }} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 8,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  className="mint-skel"
                  style={{ width: 12, height: 12, borderRadius: "50%" }}
                />
                <span className="mint-skel" style={{ height: 13, width: "28%" }} />
                <span
                  className="mint-skel"
                  style={{ height: 8, flex: 1, borderRadius: 6 }}
                />
                <span className="mint-skel" style={{ height: 13, width: 60 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="mint-catgrid">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mint-catcard">
          <div className="hd">
            <span
              className="mint-skel"
              style={{ width: 44, height: 44, borderRadius: 13 }}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="mint-skel" style={{ height: 14, width: "60%" }} />
              <span className="mint-skel" style={{ height: 11, width: 52 }} />
            </div>
          </div>
          <span
            className="mint-skel"
            style={{ height: 12, width: "40%", marginBottom: 9 }}
          />
          <span className="mint-skel" style={{ height: 20, width: "55%" }} />
        </div>
      ))}
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="mint-panel">
      {[0, 1, 2].map((g) => (
        <div key={g} className="mint-daygroup">
          <div className="mint-daylabel">
            <span className="mint-skel" style={{ height: 13, width: 100 }} />
            <span className="mint-skel" style={{ height: 13, width: 72 }} />
          </div>
          {[0, 1].map((r) => (
            <div key={r} className="mint-row">
              <div className="mint-ic">
                <span
                  className="mint-skel"
                  style={{ width: 38, height: 38, borderRadius: 11 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span className="mint-skel" style={{ height: 13, width: 150 }} />
                <span className="mint-skel" style={{ height: 11, width: 90 }} />
              </div>
              <span
                className="mint-skel"
                style={{ height: 15, width: 74, marginLeft: "auto" }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
