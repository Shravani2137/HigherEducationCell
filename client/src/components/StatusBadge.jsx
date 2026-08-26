import React from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiMessageCircle, FiCheckSquare } from 'react-icons/fi';

const statusConfig = {
  pending: { label: 'Pending', icon: FiClock, className: 'badge-pending' },
  partial: { label: 'Partial', icon: FiAlertCircle, className: 'badge-partial' },
  completed: { label: 'Completed', icon: FiCheckCircle, className: 'badge-completed' },
  follow_up: { label: 'Follow Up', icon: FiMessageCircle, className: 'badge-follow_up' },
  checked: { label: 'Reviewed', icon: FiCheckSquare, className: 'badge-checked' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.className}`}>
      <Icon />
      {config.label}
    </span>
  );
};

export default StatusBadge;
