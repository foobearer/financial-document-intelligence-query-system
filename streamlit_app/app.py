"""
streamlit_app/app.py — FinDocIQ Interactive Demo
──────────────────────────────────────────────────
Run: streamlit run streamlit_app/app.py
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).parent.parent))

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="FinDocIQ — Financial Document Intelligence",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS matching joycee.dev dark theme ──────────────────────────────────
st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;800&display=swap');

  .stApp { background-color: #0a0a0f; color: #e8e8f0; }
  h1, h2, h3 { font-family: 'Syne', sans-serif !important; color: #e8e8f0 !important; }
  .stTextInput>div>div>input, .stTextArea>div>div>textarea {
    background: #1a1a24 !important; border: 1px solid #2a2a3a !important;
    color: #e8e8f0 !important; font-family: 'JetBrains Mono', monospace !important;
  }
  .stButton>button {
    background: #00ff9d !important; color: #0a0a0f !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 700 !important; border: none !important;
  }
  .metric-card {
    background: #111118; border: 1px solid #2a2a3a;
    padding: 1rem; margin: 0.5rem 0;
  }
  .risk-high   { border-left: 3px solid #ff6b6b; padding-left: 0.75rem; }
  .risk-med    { border-left: 3px solid #ff9d00; padding-left: 0.75rem; }
  .risk-low    { border-left: 3px solid #00ff9d; padding-left: 0.75rem; }
  .sentiment-bullish  { color: #00ff9d; font-weight: 700; }
  .sentiment-bearish  { color: #ff6b6b; font-weight: 700; }
  .sentiment-cautious { color: #ff9d00; font-weight: 700; }
  .sentiment-neutral  { color: #7a7a9a; font-weight: 700; }
  code { font-family: 'JetBrains Mono', monospace !important;
         background: #1a1a24 !important; color: #00ff9d !important; }
</style>
""", unsafe_allow_html=True)


def init_session_state():
    defaults = {
        "documents": {},          # {doc_id: ProcessedDocument}
        "chat_history": [],       # [{role, content}]
        "active_doc_id": None,
        "rag_engine": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


def render_header():
    st.markdown("""
    <div style="border-bottom: 1px solid #2a2a3a; padding-bottom: 1.5rem; margin-bottom: 2rem;">
      <h1 style="font-size: 2rem; letter-spacing: -0.03em; margin: 0;">
        FinDocIQ <span style="color: #00ff9d;">Financial Document</span> Intelligence
      </h1>
      <p style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #7a7a9a; margin-top: 0.5rem;">
        Upload SEC filings · Extract metrics · Score risks · Analyse sentiment · Ask anything
      </p>
    </div>
    """, unsafe_allow_html=True)


def render_sidebar():
    with st.sidebar:
        st.markdown("### ⚙ Configuration")

        api_key = st.text_input(
            "OpenAI API Key",
            type="password",
            placeholder="sk-...",
            help="Required for Q&A, metric extraction, and sentiment analysis."
        )
        if api_key:
            import os
            os.environ["OPENAI_API_KEY"] = api_key

        st.markdown("---")
        st.markdown("### 📁 Uploaded Documents")

        if not st.session_state.documents:
            st.caption("No documents uploaded yet.")
        else:
            for doc_id, doc in st.session_state.documents.items():
                label = f"{doc.company_name or doc.filename} ({doc.period or doc.doc_type})"
                if st.button(label, key=f"select_{doc_id}"):
                    st.session_state.active_doc_id = doc_id
                    st.session_state.chat_history = []
                    if st.session_state.rag_engine:
                        st.session_state.rag_engine.reset_history()

        st.markdown("---")
        st.markdown("### 💡 Sample Questions")
        sample_questions = [
            "What were the main revenue drivers?",
            "What are the top 3 risk factors?",
            "How did gross margin change YoY?",
            "What is management's outlook for next quarter?",
            "Summarise the key financial highlights.",
        ]
        for q in sample_questions:
            if st.button(q, key=f"sample_{q[:20]}"):
                st.session_state["prefill_question"] = q

        st.markdown("---")
        st.caption("Built by [Joycee Catamora Paragas](https://joycee.dev)")


def render_upload_tab():
    st.markdown("### Upload a Financial Document")
    st.caption("Supports: SEC 10-K, 10-Q, 8-K · Earnings transcripts · Analyst reports")

    col1, col2 = st.columns([2, 1])
    with col1:
        uploaded_file = st.file_uploader(
            "Drop a PDF here",
            type=["pdf"],
            label_visibility="collapsed",
        )

    with col2:
        run_intelligence = st.checkbox(
            "Full intelligence extraction",
            value=True,
            help="Extract metrics, risks, and sentiment. Slower but more thorough."
        )

    if uploaded_file and st.button("Process Document →", type="primary"):
        with st.spinner("Processing document... this may take 30-60 seconds"):
            try:
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(uploaded_file.read())
                    tmp_path = Path(tmp.name)

                from src.ingestion.document_processor import process_document
                doc = process_document(tmp_path, run_intelligence=run_intelligence)

                st.session_state.documents[doc.document_id] = doc
                st.session_state.active_doc_id = doc.document_id

                from src.intelligence.rag_engine import RAGEngine
                st.session_state.rag_engine = RAGEngine()

                st.success(f"✅ Processed: {doc.filename}")
                st.json({
                    "document_id": doc.document_id,
                    "type":        doc.doc_type,
                    "company":     doc.company_name,
                    "period":      doc.period,
                    "pages":       doc.page_count,
                    "chunks":      doc.chunk_count,
                    "sections":    doc.sections,
                })

            except Exception as e:
                st.error(f"Processing failed: {e}")


def render_qa_tab():
    doc_id = st.session_state.active_doc_id
    if not doc_id:
        st.info("Upload and select a document first.")
        return

    doc = st.session_state.documents.get(doc_id)
    st.markdown(f"### Q&A: {doc.company_name or doc.filename}")

    # Section filter
    section_filter = None
    if doc.sections:
        section_option = st.selectbox(
            "Filter by section (optional)",
            ["All sections"] + doc.sections,
        )
        if section_option != "All sections":
            section_filter = section_option

    # Chat history
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])

    # Question input
    prefill = st.session_state.pop("prefill_question", "")
    question = st.chat_input("Ask anything about this document...", key="chat_input")
    if prefill and not question:
        question = prefill

    if question:
        st.session_state.chat_history.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.write(question)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                if not st.session_state.rag_engine:
                    from src.intelligence.rag_engine import RAGEngine
                    st.session_state.rag_engine = RAGEngine()

                result = st.session_state.rag_engine.answer(
                    document_id=doc_id,
                    question=question,
                    section_filter=section_filter,
                )
                answer = result["answer"]
                st.write(answer)

                # Show sources
                if result.get("sources"):
                    with st.expander("Sources"):
                        for src in result["sources"]:
                            st.caption(
                                f"📄 {src.get('section', 'Unknown')} — "
                                f"relevance: {src.get('relevance', 0):.2f}"
                            )

        st.session_state.chat_history.append({"role": "assistant", "content": answer})


def render_metrics_tab():
    doc_id = st.session_state.active_doc_id
    if not doc_id:
        st.info("Upload and select a document first.")
        return

    doc = st.session_state.documents[doc_id]
    st.markdown(f"### Financial Metrics: {doc.company_name or doc.filename}")

    if not doc.metrics:
        st.warning("No metrics extracted. Re-upload with 'Full intelligence extraction' enabled.")
        return

    metrics = doc.metrics

    # Key metrics in cards
    col1, col2, col3, col4 = st.columns(4)
    cols = [col1, col2, col3, col4]
    key_metrics = [
        ("Revenue", metrics.get("revenue")),
        ("Net Income", metrics.get("net_income")),
        ("EPS (diluted)", metrics.get("eps_diluted")),
        ("Gross Margin", metrics.get("gross_margin")),
    ]
    for col, (label, metric) in zip(cols, key_metrics):
        with col:
            if metric and metric.get("value") is not None:
                val = metric["value"]
                unit = metric.get("unit", "")
                display = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}"
                if "ratio" in unit:
                    display = f"{val * 100:.1f}%"
                st.metric(label=label, value=f"{display} {unit}".strip())
            else:
                st.metric(label=label, value="N/A")

    st.markdown("---")
    st.markdown("#### Full Extracted Data")
    st.json(metrics)


def render_risks_tab():
    doc_id = st.session_state.active_doc_id
    if not doc_id:
        st.info("Upload and select a document first.")
        return

    doc = st.session_state.documents[doc_id]
    st.markdown(f"### Risk Factors: {doc.company_name or doc.filename}")

    if not doc.risks:
        st.warning("No risks extracted. Re-upload with 'Full intelligence extraction' enabled.")
        return

    # Severity distribution chart
    severity_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in doc.risks:
        sev = r.get("severity", 3)
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    fig = go.Figure(go.Bar(
        x=["Minimal", "Low", "Moderate", "High", "Critical"],
        y=[severity_counts[i] for i in range(1, 6)],
        marker_color=["#00ff9d", "#7c6af7", "#ff9d00", "#ff8c00", "#ff4444"],
    ))
    fig.update_layout(
        title="Risk Factor Distribution",
        paper_bgcolor="#0a0a0f",
        plot_bgcolor="#111118",
        font_color="#e8e8f0",
        height=250,
    )
    st.plotly_chart(fig, use_container_width=True)

    # Risk list
    for risk in doc.risks:
        severity = risk.get("severity", 3)
        css_class = "risk-high" if severity >= 4 else "risk-med" if severity == 3 else "risk-low"
        new_badge = "🆕 " if risk.get("is_new") else ""

        st.markdown(f"""
        <div class="{css_class}" style="margin-bottom: 1rem;">
          <strong>{new_badge}{risk.get('title', 'Unknown Risk')}</strong>
          <span style="font-size: 0.75rem; color: #7a7a9a; margin-left: 0.5rem;">
            Severity: {severity}/5 · {risk.get('likelihood', '').title()} likelihood · {risk.get('category', '').replace('_', ' ').title()}
          </span><br>
          <span style="font-size: 0.85rem; color: #7a7a9a;">{risk.get('description', '')}</span>
        </div>
        """, unsafe_allow_html=True)


def render_sentiment_tab():
    doc_id = st.session_state.active_doc_id
    if not doc_id:
        st.info("Upload and select a document first.")
        return

    doc = st.session_state.documents[doc_id]
    st.markdown(f"### Sentiment Analysis: {doc.company_name or doc.filename}")

    if not doc.sentiments:
        st.warning("No sentiment data. Re-upload with 'Full intelligence extraction' enabled.")
        return

    from src.intelligence.sentiment_analyser import get_overall_sentiment
    overall = get_overall_sentiment(doc.sentiments)

    col1, col2, col3 = st.columns(3)
    with col1:
        sentiment_css = f"sentiment-{overall['overall'].split()[0].lower()}"
        st.markdown(f"**Overall Tone**")
        st.markdown(f"<span class='{sentiment_css}'>{overall['overall'].upper()}</span>", unsafe_allow_html=True)
    with col2:
        st.metric("Sentiment Score", f"{overall['score']:+.2f}", help="-1 = very negative, +1 = very positive")
    with col3:
        st.metric("Confidence", f"{overall['confidence']:.0%}")

    # Section breakdown
    st.markdown("---")
    st.markdown("#### By Section")

    sentiment_colors = {"bullish": "#00ff9d", "cautiously optimistic": "#7c6af7",
                        "neutral": "#7a7a9a", "cautious": "#ff9d00", "bearish": "#ff6b6b"}

    for s in doc.sentiments:
        color = sentiment_colors.get(s.get("overall_sentiment", "neutral"), "#7a7a9a")
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"**{s.get('section', 'Unknown')}**")
            if s.get("key_phrases"):
                st.caption("Key phrases: " + " · ".join(s["key_phrases"][:3]))
            if s.get("notable_language"):
                st.caption(f"Notable: {s['notable_language']}")
        with col2:
            st.markdown(f"<span style='color:{color};font-weight:700'>{s.get('overall_sentiment','').upper()}</span>", unsafe_allow_html=True)
            st.caption(f"Score: {s.get('sentiment_score', 0):+.2f}")


def render_compare_tab():
    st.markdown("### Compare Two Documents")
    st.caption("Upload two documents (e.g. Q1 2024 and Q1 2025) and compare them side by side.")

    docs = st.session_state.documents
    if len(docs) < 2:
        st.info("Upload at least two documents to compare them.")
        return

    doc_options = {
        f"{d.company_name or d.filename} ({d.period or d.doc_type})": doc_id
        for doc_id, d in docs.items()
    }

    col1, col2 = st.columns(2)
    with col1:
        doc1_label = st.selectbox("First document", list(doc_options.keys()), key="cmp1")
    with col2:
        doc2_label = st.selectbox("Second document", list(doc_options.keys()), key="cmp2")

    if doc1_label == doc2_label:
        st.warning("Select two different documents.")
        return

    if st.button("Compare Documents →", type="primary"):
        with st.spinner("Comparing documents..."):
            doc1_id = doc_options[doc1_label]
            doc2_id = doc_options[doc2_label]
            doc1 = docs[doc1_id]
            doc2 = docs[doc2_id]

            from src.intelligence.comparator import compare_documents
            result = compare_documents(
                doc1_text=doc1.full_text,
                doc2_text=doc2.full_text,
                doc1_label=doc1_label,
                doc2_label=doc2_label,
            )

            if "error" in result:
                st.error(result["error"])
                return

            st.markdown(f"#### Executive Summary")
            st.info(result.get("summary", ""))

            col1, col2, col3 = st.columns(3)
            with col1:
                rev = result.get("revenue_change", {})
                direction = rev.get("direction", "unknown")
                emoji = "📈" if direction == "up" else "📉" if direction == "down" else "➡"
                st.metric("Revenue", f"{emoji} {direction.title()}")
            with col2:
                prof = result.get("profitability_change", {})
                direction = prof.get("direction", "unknown")
                emoji = "📈" if direction == "up" else "📉" if direction == "down" else "➡"
                st.metric("Profitability", f"{emoji} {direction.title()}")
            with col3:
                sent = result.get("sentiment_shift", {})
                st.metric("Sentiment", f"{sent.get('from', '?')} → {sent.get('to', '?')}")

            if result.get("new_risks"):
                st.markdown("**🆕 New Risk Factors**")
                for r in result["new_risks"]:
                    st.markdown(f"- {r}")

            if result.get("resolved_risks"):
                st.markdown("**✅ Resolved Risks**")
                for r in result["resolved_risks"]:
                    st.markdown(f"- {r}")

            if result.get("analyst_note"):
                st.markdown("**Analyst Note**")
                st.success(result["analyst_note"])


# ── Main app ───────────────────────────────────────────────────────────────────

def main():
    init_session_state()
    render_header()
    render_sidebar()

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📤 Upload", "💬 Q&A", "📊 Metrics", "⚠ Risks", "📈 Sentiment"
    ])

    if len(st.session_state.documents) >= 2:
        tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
            "📤 Upload", "💬 Q&A", "📊 Metrics", "⚠ Risks", "📈 Sentiment", "🔄 Compare"
        ])
        with tab6:
            render_compare_tab()

    with tab1:
        render_upload_tab()
    with tab2:
        render_qa_tab()
    with tab3:
        render_metrics_tab()
    with tab4:
        render_risks_tab()
    with tab5:
        render_sentiment_tab()


if __name__ == "__main__":
    main()
