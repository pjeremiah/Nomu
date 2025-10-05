const nodemailer = require('nodemailer');

class AbuseAlertService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify transporter
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ [ABUSE ALERTS] Email transporter error:', error);
        } else {
          console.log('✅ [ABUSE ALERTS] Email transporter ready');
        }
      });
    } catch (error) {
      console.error('❌ [ABUSE ALERTS] Failed to initialize email transporter:', error);
    }
  }

  // Send abuse detection email alert
  async sendAbuseAlert(abuseData) {
    if (!this.transporter) {
      console.log('⚠️ [ABUSE ALERTS] Email transporter not available');
      return false;
    }

    try {
      const { employeeId, customerId, abuseType, details, severity } = abuseData;
      
      const subject = `🚨 ABUSE ALERT - ${severity} - Employee ${employeeId}`;
      const htmlContent = this.generateAbuseEmailHTML(abuseData);
      const textContent = this.generateAbuseEmailText(abuseData);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: this.getRecipientsBySeverity(severity),
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [ABUSE ALERTS] Email sent successfully:`, result.messageId);
      return true;
    } catch (error) {
      console.error('❌ [ABUSE ALERTS] Failed to send email:', error);
      return false;
    }
  }

  // Send escalation email alert
  async sendEscalationAlert(escalationData) {
    if (!this.transporter) {
      console.log('⚠️ [ABUSE ALERTS] Email transporter not available');
      return false;
    }

    try {
      const { employeeId, violationCount, timeWindow } = escalationData;
      
      const subject = `🚨 CRITICAL ESCALATION - Employee ${employeeId} - ${violationCount} Violations`;
      const htmlContent = this.generateEscalationEmailHTML(escalationData);
      const textContent = this.generateEscalationEmailText(escalationData);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: this.getSuperAdminRecipients(),
        subject: subject,
        text: textContent,
        html: htmlContent,
        priority: 'high'
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [ABUSE ESCALATION] Email sent successfully:`, result.messageId);
      return true;
    } catch (error) {
      console.error('❌ [ABUSE ESCALATION] Failed to send escalation email:', error);
      return false;
    }
  }

  // Generate HTML content for abuse email
  generateAbuseEmailHTML(abuseData) {
    const { employeeId, customerId, abuseType, details, severity, timestamp } = abuseData;
    
    const severityColors = {
      'LOW': '#FFA500',
      'MEDIUM': '#FF8C00', 
      'HIGH': '#FF4500',
      'CRITICAL': '#DC143C'
    };

    const abuseTypeDescriptions = {
      'repeated_scans': 'Repeated Customer Scans',
      'rapid_fire': 'Rapid Fire Scanning',
      'unusual_hours': 'Unusual Hours Scanning'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; }
            .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0; }
            .details { background-color: #f8f9fa; border-radius: 4px; padding: 15px; margin: 15px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
            .severity-${severity.toLowerCase()} { color: ${severityColors[severity]}; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🚨 Security Alert - ${abuseTypeDescriptions[abuseType] || abuseType}</h2>
                <p>Severity: <span class="severity-${severity.toLowerCase()}">${severity}</span></p>
            </div>
            <div class="content">
                <div class="alert-box">
                    <strong>⚠️ Suspicious Activity Detected</strong><br>
                    An employee has triggered our abuse detection system.
                </div>
                
                <h3>Alert Details</h3>
                <div class="details">
                    <p><strong>Employee ID:</strong> ${employeeId}</p>
                    <p><strong>Customer ID:</strong> ${customerId}</p>
                    <p><strong>Abuse Type:</strong> ${abuseTypeDescriptions[abuseType] || abuseType}</p>
                    <p><strong>Severity:</strong> <span class="severity-${severity.toLowerCase()}">${severity}</span></p>
                    <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
                </div>

                <h3>Specific Details</h3>
                <div class="details">
                    ${this.generateAbuseDetailsHTML(details, abuseType)}
                </div>

                <h3>Recommended Actions</h3>
                <ul>
                    ${this.generateRecommendedActions(severity)}
                </ul>
            </div>
            <div class="footer">
                <p>This is an automated security alert from the NOMU Cafe system.</p>
                <p>Please investigate this incident and take appropriate action.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate text content for abuse email
  generateAbuseEmailText(abuseData) {
    const { employeeId, customerId, abuseType, details, severity, timestamp } = abuseData;
    
    return `
🚨 SECURITY ALERT - ${abuseType.toUpperCase()}

Severity: ${severity}
Time: ${new Date(timestamp).toLocaleString()}

DETAILS:
- Employee ID: ${employeeId}
- Customer ID: ${customerId}
- Abuse Type: ${abuseType}
- Severity: ${severity}

SPECIFIC DETAILS:
${this.generateAbuseDetailsText(details, abuseType)}

RECOMMENDED ACTIONS:
${this.generateRecommendedActionsText(severity)}

This is an automated security alert from the NOMU Cafe system.
Please investigate this incident and take appropriate action.
    `;
  }

  // Generate HTML content for escalation email
  generateEscalationEmailHTML(escalationData) {
    const { employeeId, violationCount, timeWindow, timestamp } = escalationData;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #DC143C; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; }
            .critical-box { background-color: #ffebee; border: 2px solid #f44336; border-radius: 4px; padding: 20px; margin: 15px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🚨 CRITICAL ESCALATION - Immediate Action Required</h2>
            </div>
            <div class="content">
                <div class="critical-box">
                    <h3>⚠️ Employee Abuse Escalation</h3>
                    <p><strong>Employee ID:</strong> ${employeeId}</p>
                    <p><strong>Violation Count:</strong> ${violationCount}</p>
                    <p><strong>Time Window:</strong> ${timeWindow}</p>
                    <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
                </div>

                <h3>Immediate Actions Required:</h3>
                <ul>
                    <li>Review employee's recent activity</li>
                    <li>Consider temporary suspension pending investigation</li>
                    <li>Contact HR for disciplinary action</li>
                    <li>Review security logs for additional violations</li>
                </ul>
            </div>
            <div class="footer">
                <p><strong>CRITICAL:</strong> This employee requires immediate attention.</p>
                <p>This is an automated escalation alert from the NOMU Cafe system.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate text content for escalation email
  generateEscalationEmailText(escalationData) {
    const { employeeId, violationCount, timeWindow, timestamp } = escalationData;
    
    return `
🚨 CRITICAL ESCALATION - IMMEDIATE ACTION REQUIRED

Employee ID: ${employeeId}
Violation Count: ${violationCount}
Time Window: ${timeWindow}
Time: ${new Date(timestamp).toLocaleString()}

IMMEDIATE ACTIONS REQUIRED:
- Review employee's recent activity
- Consider temporary suspension pending investigation
- Contact HR for disciplinary action
- Review security logs for additional violations

CRITICAL: This employee requires immediate attention.
This is an automated escalation alert from the NOMU Cafe system.
    `;
  }

  // Generate abuse details HTML
  generateAbuseDetailsHTML(details, abuseType) {
    switch (abuseType) {
      case 'repeated_scans':
        return `
          <p><strong>Scans Count:</strong> ${details.count}</p>
          <p><strong>Threshold:</strong> ${details.threshold}</p>
          <p><strong>Time Window:</strong> ${details.timeWindow}</p>
        `;
      case 'rapid_fire':
        return `
          <p><strong>Scans Count:</strong> ${details.count}</p>
          <p><strong>Threshold:</strong> ${details.threshold}</p>
          <p><strong>Time Window:</strong> ${details.timeWindow}</p>
        `;
      case 'unusual_hours':
        return `
          <p><strong>Current Hour:</strong> ${details.currentHour}</p>
          <p><strong>Restricted Period:</strong> ${details.timeWindow}</p>
        `;
      default:
        return `<p>Details: ${JSON.stringify(details)}</p>`;
    }
  }

  // Generate abuse details text
  generateAbuseDetailsText(details, abuseType) {
    switch (abuseType) {
      case 'repeated_scans':
        return `- Scans Count: ${details.count}\n- Threshold: ${details.threshold}\n- Time Window: ${details.timeWindow}`;
      case 'rapid_fire':
        return `- Scans Count: ${details.count}\n- Threshold: ${details.threshold}\n- Time Window: ${details.timeWindow}`;
      case 'unusual_hours':
        return `- Current Hour: ${details.currentHour}\n- Restricted Period: ${details.timeWindow}`;
      default:
        return `- Details: ${JSON.stringify(details)}`;
    }
  }

  // Generate recommended actions HTML
  generateRecommendedActions(severity) {
    const actions = {
      'LOW': [
        '<li>Monitor employee activity</li>',
        '<li>Review scanning patterns</li>'
      ],
      'MEDIUM': [
        '<li>Review employee activity</li>',
        '<li>Consider additional training</li>',
        '<li>Monitor for repeated violations</li>'
      ],
      'HIGH': [
        '<li>Immediate review of employee activity</li>',
        '<li>Consider temporary restrictions</li>',
        '<li>Schedule meeting with employee</li>',
        '<li>Document incident</li>'
      ],
      'CRITICAL': [
        '<li>Immediate suspension pending investigation</li>',
        '<li>Contact HR immediately</li>',
        '<li>Review all recent activity</li>',
        '<li>Consider disciplinary action</li>'
      ]
    };

    return (actions[severity] || actions['MEDIUM']).join('\n');
  }

  // Generate recommended actions text
  generateRecommendedActionsText(severity) {
    const actions = {
      'LOW': [
        '- Monitor employee activity',
        '- Review scanning patterns'
      ],
      'MEDIUM': [
        '- Review employee activity',
        '- Consider additional training',
        '- Monitor for repeated violations'
      ],
      'HIGH': [
        '- Immediate review of employee activity',
        '- Consider temporary restrictions',
        '- Schedule meeting with employee',
        '- Document incident'
      ],
      'CRITICAL': [
        '- Immediate suspension pending investigation',
        '- Contact HR immediately',
        '- Review all recent activity',
        '- Consider disciplinary action'
      ]
    };

    return (actions[severity] || actions['MEDIUM']).join('\n');
  }

  // Get recipients based on severity
  getRecipientsBySeverity(severity) {
    const baseRecipients = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    if (severity === 'CRITICAL') {
      return [
        baseRecipients,
        process.env.SUPER_ADMIN_EMAIL || baseRecipients,
        process.env.HR_EMAIL || baseRecipients
      ].filter(Boolean).join(',');
    }
    
    return baseRecipients;
  }

  // Get super admin recipients
  getSuperAdminRecipients() {
    return [
      process.env.SUPER_ADMIN_EMAIL || process.env.EMAIL_USER,
      process.env.HR_EMAIL || process.env.EMAIL_USER
    ].filter(Boolean).join(',');
  }
}

module.exports = new AbuseAlertService();
