async function runAIAnalysis() {
  if (!currentProject?.id) return;
  setLoading('btn-ai-trigger', true, 'Analyzing...');
  try {
    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/v1631234567/construction_site_sample.jpg';
    await VistruAPI.CCTVAPI.triggerAnalysis(currentProject.id, imageUrl);
    showToast('🤖 AI analysis complete! New report generated.', 'success');
    await loadCCTVReports();
  } catch (err) {
    showToast('AI analysis failed. Please try again.', 'error');
  } finally {
    setLoading('btn-ai-trigger', false);
  }
}

async function loadCCTVReports() {
  if (!currentProject?.id) return;
  try {
    const data = await VistruAPI.CCTVAPI.getReports(currentProject.id);
    const reports = data.reports || [];
    document.getElementById('reports-count').textContent = `${reports.length} Report${reports.length !== 1 ? 's' : ''}`;

    if (!reports.length) {
      document.getElementById('ai-reports-list').innerHTML = `<div class="empty-state"><div class="empty-icon">🤖</div><h4>No reports yet</h4><p>AI reports will appear here once cameras are deployed and construction begins</p></div>`;
      return;
    }

    document.getElementById('ai-reports-list').innerHTML = reports.map(r => `
      <div class="ai-report" style="margin-bottom:16px">
        <div class="ai-tag">🔬 Vistru Vision AI · ${formatDate(r.generated_at)}</div>
        <div class="ai-text">
          <strong>Summary:</strong> ${r.summary}<br><br>
          ${r.observations ? `<strong>Observations:</strong> ${r.observations}<br><br>` : ''}
          ${r.material_counts && Object.keys(JSON.parse(r.material_counts || '{}')).length ? `<strong>Materials Counted:</strong> ${Object.entries(JSON.parse(r.material_counts)).map(([k,v])=>`${v} ${k.replace(/_/g,' ')}`).join(', ')}<br><br>` : ''}
          <strong>Recommendation:</strong> ${r.recommendation}
        </div>
        ${r.milestone_id ? `
          <div style="margin-top:12px;display:flex;gap:10px">
            <button class="btn btn-green btn-sm" onclick="openReleaseModal('${r.milestone_id}')">✅ Release Escrow</button>
            <button class="btn btn-ghost btn-sm" onclick="openArbitrationModal()">⚠️ Raise Dispute</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('ai-reports-list').innerHTML = `<div class="empty-state"><p>Could not load reports</p></div>`;
  }
}
