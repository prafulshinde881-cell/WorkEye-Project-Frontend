// // UPDATED: 2026-01-22 11:47 IST - Neumorphic table styling
// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Clock, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
// import { formatLastActivity } from '../utils/timeUtils';
// import React from 'react';

// // Format time: show hours + minutes (e.g. "2h 30m" or "45m")
// function formatTime(hours: number): string {
//   if (hours === 0) return '0m';
//   const totalMinutes = Math.round(hours * 60);
//   const h = Math.floor(totalMinutes / 60);
//   const m = totalMinutes % 60;
//   if (h === 0) return `${m}m`;
//   if (m === 0) return `${h}h`;
//   return `${h}h ${m}m`;
// }

// type SortField = 'name' | 'status' | 'screenTime' | 'activeTime' | 'idleTime' | 'productivity' | 'screenshots' | 'lastActivity';
// type SortOrder = 'asc' | 'desc' | null;

// interface EmployeeRow {
//   id: number;
//   name: string;
//   email: string;
//   avatar?: string;
//   role?: string;
//   status: 'active' | 'idle' | 'offline';
//   screenTime?: number;
//   activeTime?: number;
//   idleTime?: number;
//   productivity?: number;
//   screenshotsCount?: number;
//   screenshots?: any[]; // optional array used by some endpoints
//   lastActivity?: string;
// }

// export interface EmployeeOverviewTableProps {
//   employees: EmployeeRow[];
//   onEmployeeClick?: (employee: EmployeeRow) => void;
// }

// export function EmployeeOverviewTable({ employees, onEmployeeClick }: EmployeeOverviewTableProps) {
//   const navigate = useNavigate();
//   const [sortField, setSortField] = useState<SortField | null>(null);
//   const [sortOrder, setSortOrder] = useState<SortOrder>(null);
//   const [currentTime, setCurrentTime] = useState(Date.now());

//   // Update current time every 30 seconds to refresh "X mins ago" displays
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCurrentTime(Date.now());
//     }, 30000); // 30 seconds
    
//     return () => clearInterval(interval);
//   }, []);

//   const handleSort = (field: SortField) => {
//     if (sortField === field) {
//       // Cycle through: asc -> desc -> null
//       if (sortOrder === 'asc') {
//         setSortOrder('desc');
//       } else if (sortOrder === 'desc') {
//         setSortOrder(null);
//         setSortField(null);
//       }
//     } else {
//       setSortField(field);
//       setSortOrder('asc');
//     }
//   };

//   const getSortedEmployees = () => {
//     if (!sortField || !sortOrder) return employees;

//     return [...employees].sort((a, b) => {
//       let aValue: any;
//       let bValue: any;

//       switch (sortField) {
//         case 'name':
//           aValue = a.name.toLowerCase();
//           bValue = b.name.toLowerCase();
//           break;
//         case 'status':
//           const statusOrder = { active: 3, idle: 2, offline: 1 };
//           aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
//           bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
//           break;
//         case 'screenTime':
//           aValue = a.screenTime;
//           bValue = b.screenTime;
//           break;
//         case 'activeTime':
//           aValue = a.activeTime;
//           bValue = b.activeTime;
//           break;
//         case 'idleTime':
//           aValue = a.idleTime;
//           bValue = b.idleTime;
//           break;
//         case 'productivity':
//           aValue = a.productivity;
//           bValue = b.productivity;
//           break;
//         case 'screenshots':
//           aValue = a.screenshotsCount ?? a.screenshots?.length ?? 0;
//           bValue = b.screenshotsCount ?? b.screenshots?.length ?? 0;
//           break;
//         case 'lastActivity':
//           aValue = a.lastActivity;
//           bValue = b.lastActivity;
//           break;
//         default:
//           return 0;
//       }

//       if (sortOrder === 'asc') {
//         return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
//       } else {
//         return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
//       }
//     });
//   };

//   const SortIcon = ({ field }: { field: SortField }) => {
//     if (sortField !== field) {
//       return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
//     }
//     if (sortOrder === 'asc') {
//       return <ArrowUp className="w-4 h-4 text-indigo-600" />;
//     }
//     return <ArrowDown className="w-4 h-4 text-indigo-600" />;
//   };

//   const sortedEmployees = getSortedEmployees();

//   const getStatusBadge = (status: string) => {
//     if (status === 'active') return 'neu-badge-success';
//     if (status === 'idle') return 'neu-badge-warning';
//     return 'neu-badge-danger';
//   };

//   const handleViewDetails = (employee: EmployeeRow) => {
//     onEmployeeClick && onEmployeeClick(employee);
//   };

//   const handleViewAnalytics = (employee: EmployeeRow) => {
//     navigate(`/analytics?memberId=${employee.id}`);
//   };

//   return (
//     <div style={{ overflowX: 'auto' }}>
//       <table className="neu-table" style={{ width: '100%' }}>
//         <thead>
//           <tr>
//             <th>
//               <button
//                 onClick={() => handleSort('name')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Employee
//                 <SortIcon field="name" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('status')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Status
//                 <SortIcon field="status" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('screenTime')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Screen Time
//                 <SortIcon field="screenTime" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('activeTime')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Active Time
//                 <SortIcon field="activeTime" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('idleTime')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Idle Time
//                 <SortIcon field="idleTime" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('productivity')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Productivity
//                 <SortIcon field="productivity" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('screenshots')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Screenshots
//                 <SortIcon field="screenshots" />
//               </button>
//             </th>
//             <th>
//               <button
//                 onClick={() => handleSort('lastActivity')}
//                 className="neu-btn-sm"
//                 style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
//               >
//                 Last Activity
//                 <SortIcon field="lastActivity" />
//               </button>
//             </th>
//             {/* Actions column removed */}
//           </tr>
//         </thead>
//         <tbody>
//           {sortedEmployees.map((employee) => {
//             const productivity = Math.round(employee.productivity);
//             const screenshotCount = employee.screenshotsCount || employee.screenshots?.length || 0;

//             return (
//               // <tr key={employee.id} onClick={() => onEmployeeClick && onEmployeeClick(employee)} style={{ cursor: onEmployeeClick ? 'pointer' : 'default' }}>
//               <tr key={employee.id}>

//                 <td>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//                     <div style={{
//                       width: 40, height: 40, borderRadius: '50%',
//                       background: 'linear-gradient(145deg, #7477ff, #5558d9)',
//                       color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
//                     }}>
//                       {employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
//                     </div>
//                     <div>
//                       <div style={{ fontWeight: 700 }}>{employee.name}</div>
//                       <div className="neu-text-muted" style={{ fontSize: 12 }}>{employee.email}</div>
//                     </div>
//                   </div>
//                 </td>

//                 <td>
//                   <span className={`neu-badge ${employee.status === 'active' ? 'neu-badge-success' : employee.status === 'idle' ? 'neu-badge-warning' : 'neu-badge-danger'}`}>
//                     {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
//                   </span>
//                 </td>

//                 <td>{employee.screenTime ? `${Math.round(employee.screenTime * 60)}m` : '0m'}</td>
//                 <td>{employee.activeTime ? `${Math.round(employee.activeTime * 60)}m` : '0m'}</td>
//                 <td>{employee.idleTime ? `${Math.round(employee.idleTime * 60)}m` : '0m'}</td>
//                 <td>
//                   <div style={{ width: 120 }}>
//                     <div style={{ height: 8, background: '#eef2ff', borderRadius: 8, overflow: 'hidden' }}>
//                       <div style={{ width: `${Math.min(100, employee.productivity || 0)}%`, height: '100%', background: '#7c3aed' }} />
//                     </div>
//                   </div>
//                 </td>
//                 <td>
//                   <div className="neu-badge neu-badge-neutral">{employee.screenshotsCount ?? 0}</div>
//                 </td>
//                 <td>{employee.lastActivity ?? 'Never'}</td>

//                 {/* Actions removed */}
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       {employees.length === 0 && (
//         <div style={{ textAlign: 'center', padding: '48px 24px' }}>
//           <p className="neu-title" style={{ fontSize: '18px', marginBottom: '8px' }}>No employees found</p>
//           <p className="neu-text-muted">Try adjusting your filters</p>
//         </div>
//       )}
//     </div>
//   );
// }

// export default EmployeeOverviewTable;







// UPDATED: Click functionality REMOVED completely

import { useState, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import React from 'react';

// Format time: show hours + minutes
function formatTime(hours: number): string {
  if (hours === 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type SortField =
  | 'name'
  | 'status'
  | 'screenTime'
  | 'activeTime'
  | 'idleTime'
  | 'productivity'
  | 'screenshots'
  | 'lastActivity';

type SortOrder = 'asc' | 'desc' | null;

interface EmployeeRow {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  status: 'active' | 'idle' | 'offline';
  screenTime?: number;
  activeTime?: number;
  idleTime?: number;
  productivity?: number;
  screenshotsCount?: number;
  screenshots?: any[];
  lastActivity?: string;
}

export interface EmployeeOverviewTableProps {
  employees: EmployeeRow[];
}

export function EmployeeOverviewTable({ employees }: EmployeeOverviewTableProps) {

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedEmployees = () => {
    if (!sortField || !sortOrder) return employees;

    return [...employees].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;

        case 'status':
          const statusOrder = { active: 3, idle: 2, offline: 1 };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;

        case 'screenTime':
        case 'activeTime':
        case 'idleTime':
        case 'productivity':
          aValue = a[sortField] || 0;
          bValue = b[sortField] || 0;
          break;

        case 'screenshots':
          aValue = a.screenshotsCount ?? 0;
          bValue = b.screenshotsCount ?? 0;
          break;

        case 'lastActivity':
          aValue = a.lastActivity ?? '';
          bValue = b.lastActivity ?? '';
          break;

        default:
          return 0;
      }

      return sortOrder === 'asc'
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 text-indigo-600" />
      : <ArrowDown className="w-4 h-4 text-indigo-600" />;
  };

  const sortedEmployees = getSortedEmployees();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="neu-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>
              <button onClick={() => handleSort('name')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Employee <SortIcon field="name" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('status')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Status <SortIcon field="status" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('screenTime')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Screen Time <SortIcon field="screenTime" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('activeTime')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Active Time <SortIcon field="activeTime" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('idleTime')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Idle Time <SortIcon field="idleTime" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('productivity')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Productivity <SortIcon field="productivity" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('screenshots')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Screenshots <SortIcon field="screenshots" />
              </button>
            </th>

            <th>
              <button onClick={() => handleSort('lastActivity')} className="neu-btn-sm" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                Last Activity <SortIcon field="lastActivity" />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedEmployees.map((employee) => (
            <tr key={employee.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #7477ff, #5558d9)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {employee.name?.charAt(0).toUpperCase() || 'U'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700 }}>{employee.name}</div>
                    <div className="neu-text-muted" style={{ fontSize: 12 }}>
                      {employee.email}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <span className={`neu-badge ${
                  employee.status === 'active'
                    ? 'neu-badge-success'
                    : employee.status === 'idle'
                    ? 'neu-badge-warning'
                    : 'neu-badge-danger'
                }`}>
                  {employee.status}
                </span>
              </td>

              <td>{employee.screenTime ? `${Math.round(employee.screenTime * 60)}m` : '0m'}</td>
              <td>{employee.activeTime ? `${Math.round(employee.activeTime * 60)}m` : '0m'}</td>
              <td>{employee.idleTime ? `${Math.round(employee.idleTime * 60)}m` : '0m'}</td>

              <td>
                <div style={{ width: 120 }}>
                  <div style={{ height: 8, background: '#eef2ff', borderRadius: 8 }}>
                    <div style={{
                      width: `${Math.min(100, employee.productivity || 0)}%`,
                      height: '100%',
                      background: '#7c3aed'
                    }} />
                  </div>
                </div>
              </td>

              <td>
                <div className="neu-badge neu-badge-neutral">
                  {employee.screenshotsCount ?? 0}
                </div>
              </td>

              <td>{employee.lastActivity ?? 'Never'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p className="neu-title" style={{ fontSize: '18px' }}>No employees found</p>
          <p className="neu-text-muted">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}

export default EmployeeOverviewTable;
