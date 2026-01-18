import { PrismaClient } from '@prisma/client';
import PipelineGraphic from '@/components/dashboard/PipelineGraphic';
import IncidentCard from '@/components/dashboard/IncidentCard';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';
import styles from '@/components/dashboard/dashboard.module.css';

const prisma = new PrismaClient();

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const incidents = await prisma.incident.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const successSignals = await prisma.successSignal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return (
        <div className={styles.dashboardContainer}>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Silent Survey AI</h1>
                    <p className={styles.subtitle}>Autonomous Friction Detection & Correction</p>
                </div>
                <div>
                    <button style={{
                        background: '#6C5DD3',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}>
                        Live Mode
                    </button>
                </div>
            </header>

            <section style={{ marginBottom: '40px' }}>
                <PipelineGraphic />
            </section>

            <section style={{ marginBottom: '40px' }}>
                <AnalyticsCharts incidents={incidents} successSignals={successSignals} />
            </section>

            <h2 className={styles.subtitle} style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'white' }}>
                Flagged Incidents ({incidents.length})
            </h2>

            <div style={{ maxWidth: '800px' }}>
                {incidents.length === 0 ? (
                    <div className={styles.card} style={{ textAlign: 'center', color: '#888' }}>
                        No incidents detected yet. Go generate some friction!
                    </div>
                ) : (
                    incidents.map(incident => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            sentryOrg={process.env.SENTRY_ORG || 'harkirat-nagpal'}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
