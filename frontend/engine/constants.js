export const TABLES = {
    ASSEMBLY_SESSIONS: 'Assembly Sessions',
    PRODUCTION_BREAKS: 'Production Breaks',
    BUILDS: 'Builds',
    VARIANT_MFG_RELEASE: 'Variant Manufacturing Release',
    VARIANT_CONFIG: 'Variant Manufacturing Release & Operation Versions',
    PRODUCTION_STATIONS: 'Production Stations',
    PRODUCTION_LINES: 'Production Lines',
    PRODUCTION_AREAS: 'Production Areas',
    OPERATION_VERSIONS: 'Operation Versions',
    OPERATIONS: 'Operations',
    BUILD_SLOTS: 'Build Slots',
    TEAM_MEMBERS: 'Production Team Members',
    TIMESHEETS: 'Timesheets',
    KPI_RECORDS: 'KPI Records',
    KPIS: 'KPIs',
    SETTINGS: 'Settings',
    DEFECTS: 'Defects',
    SESSION_STEPS: 'Session Steps',
};

export const KPI_PRODUCTION_RATE_TARGET = 'KPI-376';

export const FIELDS = {
    ASN: {
        ASSEMBLY_SESSION_ID: 'Assembly Session ID',
        STATUS: 'Status',
        TECHNICIAN: 'Technician',
        BUILD: 'Build',
        OPERATION_VERSION: 'Operation version',
        STATION: 'Station',
        PROGRESS: 'Progress',
        ACTUAL_TIME: 'Actual Time (hh:mm:ss)',
        ASSEMBLY_TIME: 'Assembly Time (minutes)',
        TOTAL_BREAK_TIME: 'Total Break Time',
        STEP_RATE: 'Step Rate (steps/hour)',
        REMAINING_STEPS: 'Remaining Steps',
        START: 'Start',
        END: 'End',
        BREAKS: 'Breaks',
        ANDON_FLAG: 'Andon Flag',
        ANDON_CAUSE: 'Andon Cause',
    },
    BREAK: {
        STATUS: 'Status',
        BREAK_TYPE: 'Break type',
        CAUSE: 'Cause',
        ASSEMBLY_SESSION: 'Assembly Session',
        START: 'Start',
        END: 'End',
        BREAK_DELTA: 'Break delta minutes',
        TECHNICIAN: 'Technician',
    },
    BUILD: {
        BUILD_ID: 'Build ID',
        NICKNAME: 'Nickname',
        PROGRESS: 'Progress',
        ASSEMBLY_LINE: 'Assembly Line',
        GOODS_STATUS: 'Goods Status',
        ASSEMBLY_SESSION: 'Assembly Session',
        VARIANT_MFG_RELEASE: 'Variant Manufacturing Release',
        PRODUCT: 'Product',
        TOTAL_STEPS: 'Total Steps',
        COMPLETED_STEPS: 'Completed Steps',
        REMAINING_STEPS: 'Remaining Steps',
        ACTUAL_GOODS_COMPLETE: 'Actual Goods Complete Date',
    },
    VMR: {
        NAME: 'Name',
        VARIANT_ASSEMBLY: 'Variant Assembly',
        VARIANT_CONFIG: 'Variant Config',
        BUILDS: 'Builds',
    },
    VCONFIG: {
        VMR: 'Variant Manufacturing Release',
        OPERATION_VERSION: 'Operation Version',
        REPEATS: 'Operation Versions repeats',
        PERCENTAGE_OF_VARIANT: 'Percentage of Variant',
        CYCLE_TIME_HOURS: 'Cycle Time (hours)',
    },
    STEP: {
        STEP_ID: 'Step ID',
        ASN: 'Assembly Session',
        STATUS: 'Status',
        COMPLETE_TIME: 'Complete Time',
        BUILD_PCT_PER_STEP: 'Build Percentage per Step',
        STEP_NUMBER: 'Step Number',
    },
    KPI_RECORD: {
        KPI: 'KPI',
        DATE: 'Date',
        METRIC: 'Metric',
        UNIT: 'Unit',
        TYPE: 'Type',
    },
    STATION: {
        TITLE: 'Title',
        COLOUR: 'Colour',
        STATUS: 'Status',
        OPERATION: 'Operation',
        LINES: 'Lines',
        DASHBOARD_LOCATION: 'Dashboard location',
    },
    LINE: {
        ASSEMBLY_LINE: 'Assembly Line',
        STATIONS: 'Stations',
        AREA: 'Area',
        DASHBOARD_LAYOUT: 'Dashboard Layout',
        DASHBOARD_COLOUR: 'Dashboard Colour',
    },
    AREA: {
        TITLE: 'Title',
        STATIONS: 'Stations',
        LINES: 'Lines',
        TEAM_LEADER: 'Team Leader',
        QA: 'Quality Technician',
        PRODUCTION_SUPPORT: 'Engineer',
        SUPPLY_CHAIN: 'Supply Chain ', // schema has a trailing space — keep it exact
    },
    OP_VERSION: {
        OPERATION_VERSION: 'Operation Version',
        STATION: 'Station',
        SEQUENCE_ID: 'Sequence ID',
        DESCRIPTION: 'Description',
        OPERATIONS: 'Operations',
        OPERATION_NUMBER: 'Operation Number',
        TYPE: 'Type',
        PHOTO: 'Photo',
        STATUS: 'Status',
        CYCLE_TIME: 'Operation Cycle Time VA&NVA',
        FIRST_RELEASED: 'First released',
    },
    OPERATION: {
        ID: 'ID',
        TYPE: 'Type',
        STATIONS: 'Stations',
    },
    BUILD_SLOT: {
        LINE_SLOT_ID: 'Line Slot ID',
        BUILD: 'Build',
        ASSEMBLY_LINE: 'Assembly Line',
        SCHEDULED_START: 'Scheduled Start',
        SCHEDULED_END: 'Scheduled End',
    },
    TIMESHEET: {
        START: 'Start',
        END: 'End',
        PEOPLE: 'People',
        STATUS: 'Status',
        DIRECT_ASSEMBLY_COST: 'Direct Assembly Cost',
    },
    TEAM: {
        NAME: 'Name',
        PICTURE: 'Picture',
        TITLE: 'Title',
        TEAM: 'Team',
        STATUS: 'Status',
        ASSEMBLY_SESSION: 'Assembly Session',
        EMPLOYEE_STATUS: 'Employee Status',
        TYPE: 'Type',
        TIMESHEET: 'Timesheet',
    },
    SETTING: {
        VARIABLE: 'Variable',
        VALUE: 'Value',
        DESCRIPTION: 'Description',
    },
    DEFECT: {
        DCT: 'DCT',
        OBSERVATION: 'Observation',
        STATUS: 'Status',
        TYPE: 'Type',
        BUILD: 'Build',
        OPERATION_VERSION: 'Operation Version', // singleLineText — the op-version NAME
        ATTACHMENTS: 'Attachments',
        CREATED: 'Created',
        STEP: 'Step',
        PART: 'Part',
    },
};

export const DEFECT_STATUS = {
    IN_PROGRESS: 'In progress',
    DONE: 'Done',
};

export const ASN_STATUS = {
    PENDING: 'Pending',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
};

export const BREAK_TYPE = {
    REST: 'Rest',
    ANDON: 'Andon',
};

export const BREAK_STATUS = {
    IN_PROGRESS: 'In Progress',
    FINISHED: 'Finished',
};

export const GOODS_STATUS = {
    COMPLETE: 'Goods Complete',
    ASSEMBLING: 'In Progress - Assembling',
    PREPARING: 'In Progress - Preparing Material',
    SCHEDULED: 'Scheduled Goods',
    UNSCHEDULED: 'Unscheduled',
};

export const EMPLOYEE_STATUS = {
    CURRENT: 'Current',
    DEPARTED: 'Departed',
    PENDING: 'Pending',
};

export const CHECKIN_STATUS = {
    CHECKED_IN: 'Checked in',
    CHECKED_OUT: 'Checked out',
};

export const LINE_COLOURS = {
    Blue: {fill: 'rgba(255, 71, 0, 0.06)', border: 'rgba(230, 226, 219, 0.4)', text: '#e6e2db'},
    Yellow: {fill: 'rgba(234, 179, 8, 0.08)', border: 'rgba(230, 226, 219, 0.4)', text: '#e6e2db'},
    Green: {fill: 'rgba(34, 197, 94, 0.08)', border: 'rgba(230, 226, 219, 0.4)', text: '#e6e2db'},
};

export const STATION_COLOURS = {
    Blue: '#ff4700',
    Red: '#ef4444',
    Yellow: '#eab308',
    Green: '#22c55e',
    Purple: '#a855f7',
    Grey: '#9b9b9b',
    Black: '#393939',
    Orange: '#ff4700',
    Pink: '#ec4899',
    Turquoise: '#14b8a6',
};

export const TAKT_DEFAULTS = {
    AVAILABLE_HOURS: 8,
    TARGET_OUTPUT: 1,
};

export const STATION_SEQUENCE = [
    'STN-10', 'STN-20', 'STN-30', 'STN-40',
    'STN-50', 'STN-60', 'STN-70', 'STN-80',
];
