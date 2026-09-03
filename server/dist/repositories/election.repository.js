"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionRepository = exports.ElectionRepository = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
class ElectionRepository {
    async findAll() {
        return database_1.prisma.election.findMany({
            where: { deletedAt: null },
            include: {
                officer: {
                    select: { id: true, fullName: true, employeeId: true },
                },
                electionConstituencies: {
                    include: {
                        constituency: {
                            select: { id: true, name: true, _count: { select: { voters: true, candidates: true } } },
                        },
                    },
                },
                _count: { select: { electionConstituencies: true, candidates: true } },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    }
    async findById(id) {
        return database_1.prisma.election.findUnique({
            where: { id, deletedAt: null },
            include: {
                officer: {
                    include: {
                        user: { select: { id: true, email: true, isActive: true } },
                        pollingStation: { select: { id: true, name: true, code: true } },
                    },
                },
                electionConstituencies: {
                    include: {
                        constituency: {
                            include: {
                                region: { select: { id: true, name: true } },
                                pollingStations: { where: { deletedAt: null } },
                                _count: { select: { voters: true } },
                            },
                        },
                    },
                },
                candidates: { where: { deletedAt: null }, include: { party: true, constituency: true } },
            },
        });
    }
    async findActive() {
        return database_1.prisma.election.findFirst({
            where: { status: client_1.ElectionStatus.ACTIVE, deletedAt: null },
            include: {
                electionConstituencies: {
                    include: {
                        constituency: {
                            include: {
                                pollingStations: {
                                    where: { deletedAt: null },
                                    include: { officers: { where: { deletedAt: null }, include: { user: true } } },
                                },
                                candidates: { where: { deletedAt: null }, include: { party: true } },
                            },
                        },
                    },
                },
            },
        });
    }
    async create(data) {
        return database_1.prisma.election.create({ data });
    }
    async update(id, data) {
        return database_1.prisma.election.update({ where: { id }, data });
    }
    async setOfficer(electionId, officerId) {
        return database_1.prisma.election.update({
            where: { id: electionId },
            data: { officerId },
            include: {
                officer: {
                    include: {
                        user: { select: { id: true, email: true, isActive: true } },
                        pollingStation: { select: { id: true, name: true, code: true } },
                    },
                },
            },
        });
    }
    async delete(id) {
        return database_1.prisma.election.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async getStats(electionId) {
        const election = await database_1.prisma.election.findUnique({ where: { id: electionId } });
        if (!election)
            return null;
        const electionConstituencies = await database_1.prisma.electionConstituency.findMany({
            where: { electionId },
            select: { constituencyId: true },
        });
        const constituencyIds = electionConstituencies.map((ec) => ec.constituencyId);
        const [totalVoters, votedCount, totalCandidates, totalStations] = await Promise.all([
            database_1.prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
            database_1.prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, hasVoted: true } }),
            database_1.prisma.candidate.count({ where: { electionId, deletedAt: null } }),
            database_1.prisma.pollingStation.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
        ]);
        return {
            election,
            totalVoters,
            votedCount,
            turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
            totalCandidates,
            totalStations,
            totalConstituencies: constituencyIds.length,
        };
    }
    /** Pre-publish readiness checklist */
    async getReadiness(electionId) {
        const election = await database_1.prisma.election.findUnique({
            where: { id: electionId },
            include: {
                officer: { select: { id: true, fullName: true, employeeId: true } },
            },
        });
        if (!election)
            return null;
        const electionConstituencies = await database_1.prisma.electionConstituency.findMany({
            where: { electionId },
            include: {
                constituency: {
                    include: {
                        pollingStations: {
                            where: { deletedAt: null },
                            include: { officers: { where: { deletedAt: null } } },
                        },
                        _count: { select: { voters: true } },
                    },
                },
            },
        });
        const constituencyIds = electionConstituencies.map((ec) => ec.constituencyId);
        const totalConstituencies = constituencyIds.length;
        // Candidates per constituency
        const candidatesByConstituency = await database_1.prisma.candidate.groupBy({
            by: ['constituencyId'],
            where: { electionId, deletedAt: null },
            _count: { id: true },
        });
        const constituenciesWithoutCandidates = constituencyIds.filter((cid) => !candidatesByConstituency.find((c) => c.constituencyId === cid));
        // Polling stations without officers
        const allStations = electionConstituencies.flatMap((ec) => ec.constituency.pollingStations);
        const stationsWithoutOfficer = allStations.filter((s) => s.officers.length === 0);
        // Total voters
        const totalVoters = await database_1.prisma.voter.count({
            where: { constituencyId: { in: constituencyIds }, deletedAt: null },
        });
        const issues = [];
        if (totalConstituencies === 0)
            issues.push('No constituencies selected for this election.');
        if (!election.officer)
            issues.push('No Election Officer assigned. Please assign an Election Officer.');
        if (constituenciesWithoutCandidates.length > 0) {
            const names = electionConstituencies
                .filter((ec) => constituenciesWithoutCandidates.includes(ec.constituencyId))
                .map((ec) => ec.constituency.name);
            issues.push(`${names.length} constituency(ies) have no candidates: ${names.join(', ')}`);
        }
        if (stationsWithoutOfficer.length > 0) {
            issues.push(`${stationsWithoutOfficer.length} polling station(s) have no officer assigned.`);
        }
        if (totalVoters === 0)
            issues.push('No voters registered in the selected constituencies.');
        return {
            election,
            officer: election.officer,
            totalConstituencies,
            totalStations: allStations.length,
            totalVoters,
            totalCandidates: candidatesByConstituency.reduce((s, c) => s + c._count.id, 0),
            stationsWithoutOfficer: stationsWithoutOfficer.length,
            constituenciesWithoutCandidates: constituenciesWithoutCandidates.length,
            hasElectionOfficer: !!election.officer,
            issues,
            isReady: issues.length === 0,
        };
    }
}
exports.ElectionRepository = ElectionRepository;
exports.electionRepository = new ElectionRepository();
//# sourceMappingURL=election.repository.js.map