import {
  createApsSeatingChartRegistrant,
  deleteApsSeatingChartRegistrant,
  updateApsSeatingChartRegistrant,
} from '../../../graphql/mutations';
import { apsSeatingChartRegistrantsBySeatingChartID } from '../../../graphql/queries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import {
  ADMIN_SEATING_CHART_ID,
  AdminRegistrantListItem,
} from '../registrants/adminRegistrantsService';

export type SeatingAssignment = {
  id: string;
  registrantID: string;
  seatingChartID: string;
  tableNumber: number | null;
  category?: string | null;
  role?: string | null;
  notes?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
};

export async function listAdminSeatingAssignments(
  seatingChartID: string = ADMIN_SEATING_CHART_ID,
): Promise<SeatingAssignment[]> {
  let nextToken: string | null | undefined = null;
  const out: SeatingAssignment[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsSeatingChartRegistrantsBySeatingChartID,
      variables: { seatingChartID, limit: 300, nextToken },
    });
    const data = (resp as any)?.data?.apsSeatingChartRegistrantsBySeatingChartID;
    const items = (data?.items || []) as any[];
    out.push(
      ...items
        .filter((item) => !!item?.id && !!item?.registrantID)
        .map((item) => ({
          id: String(item.id),
          registrantID: String(item.registrantID),
          seatingChartID: String(item.seatingChartID || seatingChartID),
          tableNumber:
            item.tableNumber === 0 || item.tableNumber ? Number(item.tableNumber) : null,
          category: item.category ?? null,
          role: item.role ?? null,
          notes: item.notes ?? null,
          firstName: item.firstName ?? null,
          lastName: item.lastName ?? null,
          company: item.company ?? null,
          email: item.email ?? null,
        })),
    );
    nextToken = data?.nextToken;
  } while (nextToken);

  return out;
}

export async function assignRegistrantToTable(input: {
  registrant: AdminRegistrantListItem;
  tableNumber: number;
  existingAssignment?: SeatingAssignment | null;
  seatingChartID?: string;
}) {
  const seatingChartID = input.seatingChartID || ADMIN_SEATING_CHART_ID;
  if (input.existingAssignment?.id) {
    await graphqlAuthClient.graphql({
      query: updateApsSeatingChartRegistrant,
      variables: {
        input: {
          id: input.existingAssignment.id,
          tableNumber: input.tableNumber,
          category: input.existingAssignment.category ?? 'Registrant',
          role: input.registrant.attendeeType || input.existingAssignment.role || undefined,
          firstName: input.registrant.firstName || input.existingAssignment.firstName || undefined,
          lastName: input.registrant.lastName || input.existingAssignment.lastName || undefined,
          company: input.registrant.companyName || input.existingAssignment.company || undefined,
          email: input.registrant.email || input.existingAssignment.email || undefined,
        },
      },
    });
    return;
  }

  await graphqlAuthClient.graphql({
    query: createApsSeatingChartRegistrant,
    variables: {
      input: {
        seatingChartID,
        registrantID: input.registrant.id,
        tableNumber: input.tableNumber,
        category: 'Registrant',
        role: input.registrant.attendeeType || undefined,
        firstName: input.registrant.firstName || undefined,
        lastName: input.registrant.lastName || undefined,
        company: input.registrant.companyName || undefined,
        email: input.registrant.email || undefined,
      },
    },
  });
}

export async function removeSeatingAssignment(assignmentId: string) {
  await graphqlAuthClient.graphql({
    query: deleteApsSeatingChartRegistrant,
    variables: { input: { id: assignmentId } },
  });
}

