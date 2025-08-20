/**
 * EMAIL REMINDER SERVICE
 * 
 * This service handles sending email reminders for academic deadlines.
 * It includes various types of reminders and email templates.
 */

const nodemailer = require('nodemailer');
const User = require('../models/User');
const Task = require('../models/Task');
require('dotenv').config();

class EmailReminderService {
  constructor() {
    // Setup email transporter using existing configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      port: 587,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send a deadline reminder email
   * @param {Object} user - User object with email and name
   * @param {Array} tasks - Array of tasks to remind about
   * @param {Number} daysUntilDeadline - Days until deadline
   */
  async sendDeadlineReminder(user, tasks, daysUntilDeadline) {
    try {
      const emailHtml = this.generateDeadlineReminderHTML(user, tasks, daysUntilDeadline);
      const subject = this.generateSubject(tasks, daysUntilDeadline);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: emailHtml
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Reminder sent to ${user.email} for ${tasks.length} task(s)`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${user.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Send daily digest email
   * @param {Object} user - User object
   * @param {Array} todayTasks - Tasks due today
   * @param {Array} upcomingTasks - Tasks due soon
   */
  async sendDailyDigest(user, todayTasks, upcomingTasks) {
    try {
      const emailHtml = this.generateDailyDigestHTML(user, todayTasks, upcomingTasks);
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `📚 Your Academic Summary - ${new Date().toLocaleDateString()}`,
        html: emailHtml
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Daily digest sent to ${user.email}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send daily digest to ${user.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate email subject based on tasks and days until deadline
   */
  generateSubject(tasks, daysUntilDeadline) {
    const taskCount = tasks.length;
    const taskWord = taskCount === 1 ? 'task' : 'tasks';
    
    if (daysUntilDeadline === 0) {
      return `🚨 ${taskCount} academic ${taskWord} due TODAY!`;
    } else if (daysUntilDeadline === 1) {
      return `⏰ ${taskCount} academic ${taskWord} due TOMORROW!`;
    } else {
      return `📅 ${taskCount} academic ${taskWord} due in ${daysUntilDeadline} days`;
    }
  }

  /**
   * Generate HTML for deadline reminder email
   */
  generateDeadlineReminderHTML(user, tasks, daysUntilDeadline) {
    const urgencyLevel = daysUntilDeadline <= 1 ? 'urgent' : daysUntilDeadline <= 3 ? 'warning' : 'info';
    const urgencyColor = urgencyLevel === 'urgent' ? '#dc3545' : urgencyLevel === 'warning' ? '#fd7e14' : '#007bff';
    
    let tasksHtml = tasks.map(task => `
      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
        <h3 style="color: #212529; margin: 0 0 10px 0; font-size: 18px;">
          ${task.isPriority ? '🌟 ' : ''}${task.title}
        </h3>
        <p style="color: #6c757d; margin: 5px 0;">
          <strong>Category:</strong> ${task.category || 'General'}
        </p>
        <p style="color: #6c757d; margin: 5px 0;">
          <strong>Due Date:</strong> ${new Date(task.date).toLocaleDateString()} at ${new Date(task.date).toLocaleTimeString()}
        </p>
        ${task.notes ? `<p style="color: #495057; margin: 10px 0 0 0;"><em>${task.notes}</em></p>` : ''}
      </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Academic Deadline Reminder</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}aa); color: white; padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">
          ${daysUntilDeadline === 0 ? '🚨' : daysUntilDeadline === 1 ? '⏰' : '📅'} 
          Academic Deadline Reminder
        </h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Hello ${user.name}!</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 15px 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <div style="background-color: ${urgencyColor}15; border-left: 4px solid ${urgencyColor}; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-weight: bold; color: ${urgencyColor};">
            ${daysUntilDeadline === 0 
              ? `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} due TODAY!` 
              : daysUntilDeadline === 1 
              ? `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} due TOMORROW!`
              : `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} due in ${daysUntilDeadline} days.`
            }
          </p>
        </div>
        
        <h2 style="color: #212529; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Your Upcoming Tasks:</h2>
        
        ${tasksHtml}
        
        <div style="background-color: #e8f4f8; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-top: 20px; text-align: center;">
          <h3 style="color: #0c5460; margin: 0 0 10px 0;">💡 Study Tip</h3>
          <p style="color: #0c5460; margin: 0; font-style: italic;">
            "Break down large tasks into smaller, manageable chunks. You've got this! 🌟"
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0 0 10px 0;">
            This reminder was sent because you have email reminders enabled.
          </p>
          <p style="color: #6c757d; margin: 0; font-size: 12px;">
            You can manage your notification preferences in your account settings.
          </p>
        </div>
        
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Academic Deadline - Helping you succeed! 📚</p>
      </div>
      
    </body>
    </html>
    `;
  }

  /**
   * Generate HTML for daily digest email
   */
  generateDailyDigestHTML(user, todayTasks, upcomingTasks) {
    const todayTasksHtml = todayTasks.length > 0 ? todayTasks.map(task => `
      <li style="margin-bottom: 10px;">
        <strong>${task.title}</strong> 
        ${task.category ? `<span style="color: #6c757d;">(${task.category})</span>` : ''}
        ${task.isPriority ? ' 🌟' : ''}
      </li>
    `).join('') : '<li style="color: #28a745;">No tasks due today! Great job! 🎉</li>';

    const upcomingTasksHtml = upcomingTasks.length > 0 ? upcomingTasks.map(task => `
      <li style="margin-bottom: 10px;">
        <strong>${task.title}</strong> - 
        <span style="color: #dc3545;">Due: ${new Date(task.date).toLocaleDateString()}</span>
        ${task.isPriority ? ' 🌟' : ''}
      </li>
    `).join('') : '<li style="color: #6c757d;">No upcoming tasks in the next week.</li>';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Academic Summary</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📚 Your Daily Academic Summary</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Good morning, ${user.name}!</p>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">${new Date().toLocaleDateString()}</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 15px 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #dc3545; margin-bottom: 15px;">🚨 Due Today:</h2>
          <ul style="padding-left: 20px;">
            ${todayTasksHtml}
          </ul>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #fd7e14; margin-bottom: 15px;">📅 Coming Up This Week:</h2>
          <ul style="padding-left: 20px;">
            ${upcomingTasksHtml}
          </ul>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; text-align: center;">
          <h3 style="color: #0c5460; margin: 0 0 10px 0;">💪 Daily Motivation</h3>
          <p style="color: #0c5460; margin: 0; font-style: italic;">
            "Success is the sum of small efforts repeated day in and day out. Keep going!"
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0; font-size: 12px;">
            Daily digest sent at ${new Date().toLocaleTimeString()} | Academic Deadline
          </p>
        </div>
        
      </div>
      
    </body>
    </html>
    `;
  }
}

module.exports = new EmailReminderService();
