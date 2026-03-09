"""Tool definitions for Ollama function-calling."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "createEvent",
            "description": "Create a new event with the given details",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Event title",
                    },
                    "description": {
                        "type": "string",
                        "description": "Event description",
                    },
                    "city": {
                        "type": "string",
                        "description": "City where the event takes place",
                    },
                    "venue": {
                        "type": "string",
                        "description": "Venue name",
                    },
                    "startsAt": {
                        "type": "string",
                        "description": "Start date/time in ISO 8601 format",
                    },
                    "endsAt": {
                        "type": "string",
                        "description": "End date/time in ISO 8601 format (optional)",
                    },
                    "capacity": {
                        "type": "integer",
                        "description": "Total event capacity",
                    },
                    "price": {
                        "type": "number",
                        "description": "Ticket price in RSD (0 for free events)",
                    },
                    "categoryId": {
                        "type": "integer",
                        "description": "Category ID",
                    },
                    "subcategoryId": {
                        "type": "integer",
                        "description": "Subcategory ID",
                    },
                },
                "required": ["title", "startsAt", "capacity", "categoryId", "subcategoryId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generateDescription",
            "description": "Generate a marketing description for an event",
            "parameters": {
                "type": "object",
                "properties": {
                    "eventTitle": {
                        "type": "string",
                        "description": "Event title to generate description for",
                    },
                    "tone": {
                        "type": "string",
                        "description": "Tone of the description: professional, casual, exciting",
                        "enum": ["professional", "casual", "exciting"],
                    },
                },
                "required": ["eventTitle"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyzeSales",
            "description": "Analyze ticket sales data for a given period",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to analyze (default: 30)",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "updateTickets",
            "description": "Update ticket price or capacity for an event",
            "parameters": {
                "type": "object",
                "properties": {
                    "eventId": {
                        "type": "integer",
                        "description": "Event ID to update",
                    },
                    "price": {
                        "type": "number",
                        "description": "New ticket price",
                    },
                    "capacity": {
                        "type": "integer",
                        "description": "New capacity",
                    },
                },
                "required": ["eventId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "sendMarketingEmail",
            "description": "Send a marketing email to users about upcoming events",
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Email subject line",
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body text",
                    },
                    "targetAudience": {
                        "type": "string",
                        "description": "Target audience: all, recent_buyers, inactive",
                        "enum": ["all", "recent_buyers", "inactive"],
                    },
                },
                "required": ["subject", "body"],
            },
        },
    },
]

DEMO_PROMPTS = [
    "Create a concert event for next Saturday at Arena Belgrade with 500 capacity",
    "Analyze ticket sales for the past 30 days",
    "Draft a marketing email for upcoming weekend events",
]
