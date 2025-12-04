import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// Enum: CompanyType
const CompanyType = a.enum(['OEMTIER1', 'SOLUTIONPROVIDER', 'SPONSOR']);

// Main Schema Definition
const schema = a.schema({
  // CompanyType Enum
  CompanyType,

  // Main Event Type
  APS: a
    .model({
      year: a.string().required(),
      codes: a.string().array(),
      agenda: a.hasOne('ApsAgenda', 'eventId'),
      Registrants: a.hasMany('ApsRegistrant', 'apsID'),
      Sponsors: a.hasMany('ApsSponsor', 'eventId'),
      Speakers: a.hasMany('APSSpeaker', 'eventId'),
      Companies: a.hasMany('APSCompany', 'eventId'),
      photos: a.hasMany('ApsAppUserPhoto', 'eventId'),
      exhibitors: a.hasMany('ApsAppExhibitorProfile', 'eventId'),
      messages: a.hasMany('ApsAppMessage', 'eventId'),
      exhibitorPromotions: a.hasMany('ApsAppExhibitorPromotion', 'eventId'),
      exhibitorDeals: a.hasMany('ApsAppExhibitorDeal', 'eventId'),
      exhibitorPhotos: a.hasMany('ApsAppExhibitorPhoto', 'eventId'),
      exhibitorHandouts: a.hasMany('ApsAppExhibitorHandout', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Board Members
  APSBoard: a
    .model({
      name: a.string().required(),
      title: a.string(),
      bio: a.string(),
      company: a.string().required(),
      email: a.string().required(),
      linkedin: a.string(),
      profilePic: a.string(),
    })
    .authorization((allow) => [allow.guest()]),

  // Agenda
  ApsAgenda: a
    .model({
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
      items: a.hasMany('ApsAppSession', 'agendaId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Registrants
  ApsRegistrant: a
    .model({
      apsID: a.id().required(),
      aps: a.belongsTo('APS', 'apsID'),
      firstName: a.string(),
      lastName: a.string(),
      email: a.string().required(),
      phone: a.string(),
      companyId: a.id(),
      company: a.belongsTo('APSCompany', 'companyId'),
      jobTitle: a.string(),
      attendeeType: a.string(),
      termsAccepted: a.boolean(),
      interests: a.string().array(),
      otherInterest: a.string(),
      speedNetworking: a.boolean(),
      speedNetworkingStatus: a.string(),
      billingAddressFirstName: a.string(),
      billingAddressLastName: a.string(),
      billingAddressEmail: a.string(),
      billingAddressPhone: a.string(),
      billingAddressStreet: a.string(),
      billingAddressCity: a.string(),
      billingAddressState: a.string(),
      billingAddressZip: a.string(),
      sameAsAttendee: a.boolean(),
      speakerTopic: a.string(),
      learningObjectives: a.string(),
      totalAmount: a.integer(),
      discountCode: a.string(),
      status: a.string().default('PENDING'),
      // addOns: many-to-many relationship - requires junction model
      morrisetteTransportation: a.string(),
      morrisetteStatus: a.string(),
      aristoTransportation: a.string(),
      aristoStatus: a.string(),
      magnaTransportation: a.string(),
      magnaStatus: a.string(),
      paymentConfirmation: a.string(),
      registrationEmailSent: a.boolean(),
      registrationEmailSentDate: a.string(),
      registrationEmailReceived: a.boolean(),
      registrationEmailReceivedDate: a.string(),
      welcomeEmailSent: a.boolean(),
      welcomeEmailSentDate: a.string(),
      welcomeEmailReceived: a.boolean(),
      welcomeEmailReceivedDate: a.string(),
      paymentMethod: a.string(),
      paymentLast4: a.string(),
      approvedAt: a.string(),
      headshot: a.string(),
      presentation: a.string(),
      presentationTitle: a.string(),
      presentationSummary: a.string(),
      bio: a.string(),
      seatingChartRegistrant: a.hasOne(
        'ApsSeatingChartRegistrant',
        'registrantID'
      ),
      appUser: a.hasOne('ApsAppUser', 'registrantId'),
      // contactOf: many-to-many relationship - requires junction model
      // leadOf: many-to-many relationship - requires junction model
    })
    .authorization((allow) => [allow.guest()]),

  // App User (for mobile app)
  ApsAppUser: a
    .model({
      registrantId: a.id().required(),
      registrant: a.belongsTo('ApsRegistrant', 'registrantId'),
      // contacts: many-to-many relationship - requires junction model
      // leads: many-to-many relationship - requires junction model
      qrCode: a.string(),
      // sessions: many-to-many relationship - requires junction model
      photos: a.hasMany('ApsAppUserPhoto', 'userId'),
      messages: a.hasMany('ApsAppMessage', 'userId'),
      sessionQuestions: a.hasMany('ApsAppSessionQuestion', 'userId'),
      exhibitorDeals: a.hasMany('ApsAppExhibitorDeal', 'userId'),
      // exhibitorStaff: many-to-many relationship - requires junction model
    })
    .authorization((allow) => [allow.guest()]),

  // App User Photos
  ApsAppUserPhoto: a
    .model({
      userId: a.id(),
      user: a.belongsTo('ApsAppUser', 'userId'),
      photo: a.string(),
      caption: a.string(),
      approved: a.boolean().default(false),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Sessions
  ApsAppSession: a
    .model({
      // user: many-to-many relationship - requires junction model
      session: a.string(),
      date: a.string(),
      time: a.string(),
      location: a.string(),
      // speakers: many-to-many relationship - requires junction model
      // sponsors: many-to-many relationship - requires junction model
      agendaId: a.id(),
      agenda: a.belongsTo('ApsAgenda', 'agendaId'),
      sessionQuestions: a.hasMany('ApsAppSessionQuestion', 'sessionId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Session Questions
  ApsAppSessionQuestion: a
    .model({
      sessionId: a.id().required(),
      session: a.belongsTo('ApsAppSession', 'sessionId'),
      question: a.string(),
      userId: a.id().required(),
      user: a.belongsTo('ApsAppUser', 'userId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Speakers
  APSSpeaker: a
    .model({
      firstName: a.string().required(),
      lastName: a.string().required(),
      email: a.string().required(),
      company: a.string().required(),
      title: a.string().required(),
      phone: a.string(),
      linkedin: a.string(),
      bio: a.string().required(),
      presentationTitle: a.string(),
      presentationSummary: a.string(),
      headshot: a.string().required(),
      mediaConsent: a.boolean(),
      privacyConsent: a.boolean(),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
      // sessions: many-to-many relationship - requires junction model
    })
    .authorization((allow) => [allow.guest()]),

  // Sponsors
  ApsSponsor: a
    .model({
      companyId: a.id().required(),
      company: a.belongsTo('APSCompany', 'companyId'),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
      profile: a.hasOne('ApsAppExhibitorProfile', 'sponsorId'),
      // sessions: many-to-many relationship - requires junction model
    })
    .authorization((allow) => [allow.guest()]),

  // Companies
  APSCompany: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      type: CompanyType,
      registrants: a.hasMany('ApsRegistrant', 'companyId'),
      description: a.string(),
      website: a.string(),
      phone: a.string(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zip: a.string(),
      country: a.string(),
      logo: a.string(),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
      sponsors: a.hasMany('ApsSponsor', 'companyId'),
      exhibitorProfiles: a.hasMany('ApsAppExhibitorProfile', 'companyId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Exhibitor Profiles
  ApsAppExhibitorProfile: a
    .model({
      companyId: a.id().required(),
      company: a.belongsTo('APSCompany', 'companyId'),
      sponsorId: a.id(),
      sponsor: a.belongsTo('ApsSponsor', 'sponsorId'),
      title: a.string(),
      phone: a.string(),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
      deals: a.hasMany('ApsAppExhibitorDeal', 'exhibitorId'),
      photos: a.hasMany('ApsAppExhibitorPhoto', 'exhibitorId'),
      handouts: a.hasMany('ApsAppExhibitorHandout', 'exhibitorId'),
      promotions: a.hasMany('ApsAppExhibitorPromotion', 'exhibitorId'),
      // staff: many-to-many relationship - requires junction model
      video: a.string(),
      videoCaption: a.string(),
      boothNumber: a.string(),
      visits: a.integer(),
      views: a.integer(),
      likes: a.integer(),
      inquiries: a.hasMany('ApsAppMessage', 'exhibitorId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Messages
  ApsAppMessage: a
    .model({
      type: a.string(),
      message: a.string(),
      userId: a.id(),
      user: a.belongsTo('ApsAppUser', 'userId'),
      exhibitorId: a.id(),
      exhibitor: a.belongsTo('ApsAppExhibitorProfile', 'exhibitorId'),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Exhibitor Promotions
  ApsAppExhibitorPromotion: a
    .model({
      exhibitorId: a.id().required(),
      exhibitor: a.belongsTo('ApsAppExhibitorProfile', 'exhibitorId'),
      promotion: a.string(),
      link: a.string(),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Exhibitor Deals
  ApsAppExhibitorDeal: a
    .model({
      exhibitorId: a.id().required(),
      exhibitor: a.belongsTo('ApsAppExhibitorProfile', 'exhibitorId'),
      deal: a.string(),
      link: a.string(),
      userId: a.id(),
      user: a.belongsTo('ApsAppUser', 'userId'),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Exhibitor Photos
  ApsAppExhibitorPhoto: a
    .model({
      exhibitorId: a.id().required(),
      exhibitor: a.belongsTo('ApsAppExhibitorProfile', 'exhibitorId'),
      photo: a.string(),
      caption: a.string(),
      approved: a.boolean().default(false),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Exhibitor Handouts
  ApsAppExhibitorHandout: a
    .model({
      exhibitorId: a.id().required(),
      exhibitor: a.belongsTo('ApsAppExhibitorProfile', 'exhibitorId'),
      handout: a.string(),
      eventId: a.id().required(),
      event: a.belongsTo('APS', 'eventId'),
    })
    .authorization((allow) => [allow.guest()]),

  // Add Ons
  ApsAddOn: a
    .model({
      title: a.string().required(),
      description: a.string().required(),
      subheadline: a.string(),
      location: a.string().required(),
      date: a.string().required(),
      time: a.string().required(),
      company: a.string().required(),
      altLink: a.string(),
      // apsRegistrants: many-to-many relationship - requires junction model
      type: a.string(),
      limit: a.integer(),
    })
    .authorization((allow) => [allow.guest()]),

  // Seating Charts
  ApsSeatingChart: a
    .model({
      registrants: a.hasMany('ApsSeatingChartRegistrant', 'seatingChartID'),
    })
    .authorization((allow) => [allow.guest()]),

  ApsSeatingChartRegistrant: a
    .model({
      category: a.string(),
      firstName: a.string(),
      lastName: a.string(),
      company: a.string(),
      email: a.string(),
      role: a.string(),
      tableNumber: a.integer(),
      notes: a.string(),
      seatingChartID: a.id().required(),
      seatingChart: a.belongsTo('ApsSeatingChart', 'seatingChartID'),
      registrantID: a.id().required(),
      registrant: a.belongsTo('ApsRegistrant', 'registrantID'),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
