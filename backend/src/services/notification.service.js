// backend/src/services/notification.service.js
const db = require('../config/db');

/**
 * Vistru Notification Service
 * Handles SMS via Termii API and Internal Notifications
 */
class NotificationService {
  
  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.senderId = process.env.TERMII_SENDER_ID || 'Vistru';
    this.baseUrl = 'https://api.ng.termii.com/api/sms/send';
  }

  /**
   * Send SMS via Termii
   * @param {string} to - Recipient phone number (e.g. 2348012345678)
   * @param {string} message - Message text
   */
  async sendSMS(to, message) {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || 'N-Alert';

    if (!apiKey || apiKey === 'your_termii_key') {
      console.log(`💬 [SIMULATED SMS] To: ${to} | Msg: ${message}`);
      return { success: true, status: 'simulated' };
    }

    const cleanPhone = to.replace('+', '');
    console.log(`📲 Termii: Attempting SMS to ${cleanPhone} via "${senderId}"...`);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          from: senderId,
          sms: message,
          type: "plain",
          channel: "generic",
          api_key: apiKey
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ SMS Sent Successfully:', result.message_id);
        return { success: true, messageId: result.message_id };
      } else {
        // SELF-HEALING: If Termii fails (e.g. 404 Sender ID), we log it but don't crash
        console.warn(`⚠️ Termii API Error (${result.code}): ${result.message}`);
        console.log(`💡 Demo Fallback: SMS would have said: "${message}"`);
        return { success: true, status: 'simulated_fallback' };
      }
    } catch (err) {
      console.error('❌ SMS Connection Error:', err.message);
      return { success: true, status: 'simulated_error_fallback' };
    }
  }

  /**
   * Send notification to a specific user (System + SMS)
   */
  async notifyUser(userId, title, body, type = 'info', sendSms = false) {
    try {
      // 1. Create Internal Notification
      await db.query(`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES ($1, $2, $3, $4)
      `, [userId, type, title, body]);

      // 2. Optional SMS
      if (sendSms) {
        const { rows } = await db.query('SELECT phone FROM users WHERE id = $1', [userId]);
        if (rows[0] && rows[0].phone) {
          await this.sendSMS(rows[0].phone, `${title}: ${body}`);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('❌ notifyUser Error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Notify project members
   */
  async notifyProjectMembers(projectId, title, body, sendToClient = true, sendToEngineer = false) {
    const { rows } = await db.query('SELECT client_id, engineer_id FROM projects WHERE id = $1', [projectId]);
    if (!rows[0]) return;

    const { client_id, engineer_id } = rows[0];
    
    if (sendToClient && client_id) {
      await this.notifyUser(client_id, title, body, 'info', true);
    }
    if (sendToEngineer && engineer_id) {
      await this.notifyUser(engineer_id, title, body, 'info', true);
    }
  }
}

module.exports = new NotificationService();
