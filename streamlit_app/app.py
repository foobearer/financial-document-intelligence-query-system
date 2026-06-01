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