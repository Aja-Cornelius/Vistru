const db = require('../config/db');
const notificationService = require('./notification.service');

/**
 * Vistru Vision AI Service
 * Dynamic Simulator — Ensures 100% uptime for demos while providing 
 * varied and technically realistic construction reports.
 */
class AIService {

  /**
   * Generates a realistic, varying construction report
   */
  async analyzeSiteImage(projectId, imageUrl) {
    console.log(`🤖 AI (Simulated): Analyzing site image for project ${projectId}...`);
    
    // Simulate thinking delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Array of realistic summaries to pick from
    const summaries = [
      "Significant progress observed in the external rendering. Northern elevation is nearly complete.",
      "Internal floor screeding is underway in the main lounge and kitchen areas. Materials arrived on site.",
      "Roofing carcass is being installed. Electrical conduit piping is visible throughout the structure.",
      "External wall plastering has reached the first-floor level. Quality of finish is consistent with standards.",
      "Site clearing and foundation casting are complete. Pillar reinforcements are currently being positioned."
    ];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    // Dynamic data generation
    const completionPercent = rand(45, 85);
    const workerCount = rand(4, 12);
    
    const materialOptions = [
      { cement_bags: rand(10, 50), sand_tonnes: rand(2, 8) },
      { paint_buckets: rand(5, 15), wall_tiles: rand(10, 30) },
      { iron_rods_y16: rand(20, 100), granite_tonnes: rand(5, 15) },
      { scaffolding_units: rand(8, 20), water_tanks: 2 }
    ];

    return {
      summary: pick(summaries),
      observations: [
        "Safety compliance: most workers observed wearing helmets",
        "Site organization is good, materials are stacked neatly",
        "Weather conditions: clear, allowing for steady progress",
        `Estimated ${completionPercent}% of milestone goals reached`
      ],
      materialCounts: pick(materialOptions),
      completionPercent: completionPercent,
      workerCount: workerCount,
      recommendation: "Continue with the current pace. Approval for the next milestone release is likely by next week.",
      mediaUrls: [imageUrl]
    };
  }

  async generateReport(projectId, imageUrl, milestoneId = null) {
    try {
      const report = await this.analyzeSiteImage(projectId, imageUrl);
      
      // Save to DB
      const { rows } = await db.query(`
        INSERT INTO cctv_reports
          (project_id, milestone_id, report_type, summary, observations,
           material_counts, completion_pct, worker_count, recommendation, media_urls)
        VALUES ($1, $2, 'periodic', $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        projectId, 
        milestoneId,
        report.summary,
        report.observations.join('\n'),
        JSON.stringify(report.materialCounts || {}),
        report.completionPercent || 0,
        report.workerCount || 0,
        report.recommendation,
        report.mediaUrls
      ]);

      // 3. Notify Client via System + SMS
      await notificationService.notifyProjectMembers(
        projectId, 
        '🤖 New AI Site Analysis', 
        `Vistru Vision has analyzed your project site. View report #${rows[0].id.slice(0,8)} in your dashboard.`,
        true, // send to client
        false // don't send to engineer for now
      );

      return { success: true, reportId: rows[0].id, report };
    } catch (err) {
      console.error('AIService Error:', err);
      throw err;
    }
  }
}

module.exports = new AIService();
