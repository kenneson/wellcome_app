import path from 'path';
import dotenv from 'dotenv';

// Explicitly load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { PrismaEventRepository } from './infrastructure/repositories/PrismaEventRepository';
import { CreateEventUseCase } from './application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from './application/use-cases/ListEventsUseCase';
import { UpdateEventUseCase } from './application/use-cases/UpdateEventUseCase';
import { DeleteEventUseCase } from './application/use-cases/DeleteEventUseCase';
import { JoinEventUseCase } from './application/use-cases/JoinEventUseCase';
import { CancelEventRegistrationUseCase } from './application/use-cases/CancelEventRegistrationUseCase';
import { ApproveRegistrationUseCase } from './application/use-cases/ApproveRegistrationUseCase';
import { RejectRegistrationUseCase } from './application/use-cases/RejectRegistrationUseCase';
import { UpdateUserProfileUseCase } from './application/use-cases/UpdateUserProfileUseCase';
import { EventController } from './presentation/http/controllers/EventController';
import { EventRegistrationController } from './presentation/http/controllers/EventRegistrationController';
import { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
import { UserController } from './presentation/http/controllers/UserController';
import { AuthController } from './presentation/http/controllers/AuthController';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository';
import { PrismaEventRegistrationRepository } from './infrastructure/repositories/PrismaEventRegistrationRepository';
import { LoginUseCase } from './application/use-cases/Auth/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/Auth/RegisterUseCase';
import { PrismaEventQuestionRepository } from './infrastructure/repositories/PrismaEventQuestionRepository';

const fastify = Fastify({
    logger: true
});

const start = async () => {
    try {
        await fastify.register(fastifyCors, {
            origin: true, // Allow all origins
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            credentials: true
        });

        await fastify.register(fastifySwagger, {
            openapi: {
                info: {
                    title: 'Wellcome API',
                    description: 'API documentation for Wellcome application',
                    version: '1.0.0'
                },
                servers: [{ url: 'http://localhost:3000' }],
                tags: [
                    { name: 'Events', description: 'Event management endpoints' },
                    { name: 'General', description: 'General endpoints' }
                ]
            }
        });

        await fastify.register(fastifySwaggerUi, {
            routePrefix: '/docs',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: false
            },
            staticCSP: true,
        });



        // Dependency Injection (Manual for now)
        const eventRepository = new PrismaEventRepository();
        const eventQuestionRepository = new PrismaEventQuestionRepository();
        const userRepository = new PrismaUserRepository();
        const { notificationService } = require('./application/services/NotificationService'); // Import service

        const createEventUseCase = new CreateEventUseCase(eventRepository, eventQuestionRepository, userRepository);
        const listEventsUseCase = new ListEventsUseCase(eventRepository);
        const updateEventUseCase = new UpdateEventUseCase(eventRepository, eventQuestionRepository);
        const deleteEventUseCase = new DeleteEventUseCase(eventRepository);
        const eventController = new EventController(createEventUseCase, listEventsUseCase, updateEventUseCase, deleteEventUseCase);

        // Auth Dependencies
        const loginUseCase = new LoginUseCase();
        const registerUseCase = new RegisterUseCase();
        const authController = new AuthController(loginUseCase, registerUseCase);

        // Auth Routes
        fastify.post('/auth/login', {
            schema: {
                description: 'Login user',
                tags: ['Auth'],
                body: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'Login successful',
                        type: 'object',
                        properties: {
                            user: { type: 'object', additionalProperties: true },
                            session: { type: 'object', additionalProperties: true }
                        }
                    }
                }
            }
        }, (req, reply) => authController.login(req, reply));

        fastify.post('/auth/register', {
            schema: {
                description: 'Register user',
                tags: ['Auth'],
                body: {
                    type: 'object',
                    required: ['email', 'password', 'fullName'],
                    properties: {
                        email: { type: 'string' },
                        password: { type: 'string' },
                        fullName: { type: 'string' }
                    }
                },
                response: {
                    201: {
                        description: 'Registration successful',
                        type: 'object',
                        properties: {
                            user: { type: 'object', additionalProperties: true },
                            session: { type: 'object', additionalProperties: true }
                        }
                    }
                }
            }
        }, (req, reply) => authController.register(req, reply));

        // Routes
        fastify.post('/events', {
            schema: {
                description: 'Create a new event',
                tags: ['Events'],
                body: {
                    type: 'object',
                    required: ['title', 'description', 'price', 'maxGuests', 'eventDate', 'location', 'hostId'],
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        maxGuests: { type: 'integer' },
                        eventDate: { type: 'string', format: 'date-time' },
                        location: { type: 'string' },
                        latitude: { type: 'number', nullable: true },
                        longitude: { type: 'number', nullable: true },
                        coverImageUrl: { type: 'string', nullable: true },
                        hostId: { type: 'string' },
                        questions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['question', 'questionType'],
                                properties: {
                                    question: { type: 'string' },
                                    questionType: { type: 'string' },
                                    required: { type: 'boolean' },
                                    options: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                },
                response: {
                    201: {
                        description: 'Event created successfully',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string' },
                            price: { type: 'number' },
                            maxGuests: { type: 'integer' },
                            eventDate: { type: 'string' },
                            location: { type: 'string' },
                            createdAt: { type: 'string' },
                            updatedAt: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => eventController.create(req, reply));

        fastify.get('/events', {
            schema: {
                description: 'List events with optional filtering',
                tags: ['Events'],
                querystring: {
                    type: 'object',
                    properties: {
                        lat: { type: 'string', description: 'Latitude' },
                        lon: { type: 'string', description: 'Longitude' },
                        radius: { type: 'string', description: 'Radius in KM' }
                    }
                },
                response: {
                    200: {
                        description: 'List of events',
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                price: { type: 'number' },
                                location: { type: 'string' },
                                eventDate: { type: 'string' },
                                coverImageUrl: { type: 'string', nullable: true },
                                host: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        fullName: { type: 'string', nullable: true },
                                        username: { type: 'string', nullable: true },
                                        avatarUrl: { type: 'string', nullable: true },
                                        isSuperhost: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, (req, reply) => eventController.list(req, reply));


        fastify.get('/', {
            schema: {
                description: 'Health check endpoint',
                tags: ['General'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            hello: { type: 'string' }
                        }
                    }
                }
            }
        }, async () => {
            return { hello: 'Wellcome API' };
        });

        // Event Registration Dependencies
        const eventRegistrationRepository = new PrismaEventRegistrationRepository();
        const joinEventUseCase = new JoinEventUseCase(eventRegistrationRepository, eventRepository, notificationService);
        const cancelEventRegistrationUseCase = new CancelEventRegistrationUseCase(eventRegistrationRepository);
        const approveRegistrationUseCase = new ApproveRegistrationUseCase(eventRegistrationRepository);
        const rejectRegistrationUseCase = new RejectRegistrationUseCase(eventRegistrationRepository);

        const eventRegistrationController = new EventRegistrationController(
            joinEventUseCase,
            cancelEventRegistrationUseCase,
            approveRegistrationUseCase,
            rejectRegistrationUseCase
        );

        fastify.post('/bookings', {
            schema: {
                description: 'Join an event',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['eventId', 'userId'],
                    properties: {
                        eventId: { type: 'string' },
                        userId: { type: 'string' },
                        answers: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    questionId: { type: 'string' },
                                    answer: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                response: {
                    201: {
                        description: 'Booking created successfully',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            eventId: { type: 'string' },
                            userId: { type: 'string' },
                            status: { type: 'string' },
                            createdAt: { type: 'string' },
                            updatedAt: { type: 'string' }
                        }
                    },
                    409: {
                        description: 'Event full or user already booked',
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => eventRegistrationController.create(req, reply));

        // Get registrations for an event (for host to manage)
        fastify.get('/bookings/event/:eventId', {
            schema: {
                description: 'Get all registrations for an event',
                tags: ['Bookings'],
                params: {
                    type: 'object',
                    properties: {
                        eventId: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'List of registrations',
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                eventId: { type: 'string' },
                                userId: { type: 'string' },
                                status: { type: 'string' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        fullName: { type: 'string' },
                                        avatarUrl: { type: 'string' },
                                        occupation: { type: 'string' }
                                    }
                                },
                                createdAt: { type: 'string' }
                            }
                        }
                    },
                    500: {
                        description: 'Internal server error',
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, async (req, reply) => {
            const { eventId } = req.params as { eventId: string };
            try {
                const registrations = await eventRegistrationRepository.findByEventIdWithUser(eventId);
                return reply.send(registrations);
            } catch (error) {
                console.error('Error fetching registrations:', error);
                return reply.code(500).send({ message: 'Internal server error' });
            }
        });

        // Approval endpoints
        fastify.post('/bookings/approve', {
            schema: {
                description: 'Approve a registration',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['registrationId', 'hostId'],
                    properties: {
                        registrationId: { type: 'string' },
                        hostId: { type: 'string' }
                    }
                },
                response: {
                    200: { description: 'Registration approved' }
                }
            }
        }, (req, reply) => eventRegistrationController.approve(req, reply));

        fastify.post('/bookings/reject', {
            schema: {
                description: 'Reject a registration',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['registrationId', 'hostId', 'reason'],
                    properties: {
                        registrationId: { type: 'string' },
                        hostId: { type: 'string' },
                        reason: { type: 'string' }
                    }
                },
                response: {
                    200: { description: 'Registration rejected' }
                }
            }
        }, (req, reply) => eventRegistrationController.reject(req, reply));



        interface NotificationTestBody {
            token: string;
            title: string;
            body: string;
            data?: Record<string, any>;
        }

        fastify.post<{ Body: NotificationTestBody }>('/notifications/test', {
            schema: {
                description: 'Send a test push notification',
                tags: ['General'],
                body: {
                    type: 'object',
                    required: ['token', 'title', 'body'],
                    properties: {
                        token: { type: 'string' },
                        title: { type: 'string' },
                        body: { type: 'string' },
                        data: { type: 'object', additionalProperties: true }
                    }
                },
                response: {
                    200: {
                        description: 'Notification sent',
                        type: 'object',
                        properties: { success: { type: 'boolean' } }
                    }
                }
            }
        }, async (req, reply) => {
            const { token, title, body, data } = req.body;
            const { notificationService } = require('./application/services/NotificationService');
            await notificationService.sendPushBlocking(token, title, body, data);
            return { success: true };
        });

        // User Dependencies
        // userRepository moved up for CreateEventUseCase
        const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
        const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
        const userController = new UserController(getUserProfileUseCase, updateUserProfileUseCase);

        fastify.get('/users/:id', {
            schema: {
                description: 'Get user profile',
                tags: ['Users'],
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'User profile found',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' },
                            name: { type: 'string' },
                            fullName: { type: 'string', nullable: true },
                            username: { type: 'string', nullable: true },
                            bio: { type: 'string', nullable: true },
                            website: { type: 'string', nullable: true },
                            occupation: { type: 'string', nullable: true },
                            lookingFor: { type: 'string', nullable: true },
                            city: { type: 'string', nullable: true },
                            neighborhood: { type: 'string', nullable: true },
                            languages: { type: 'array', items: { type: 'string' } },
                            dietaryRestrictions: { type: 'array', items: { type: 'string' } },
                            avatarUrl: { type: 'string', nullable: true },
                            events: { type: 'array', items: { type: 'object', additionalProperties: true } },
                            bookings: { type: 'array', items: { type: 'object', additionalProperties: true } }
                        }
                    },
                    404: {
                        description: 'User not found',
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => userController.getProfile(req, reply));

        fastify.put('/users/:id', {
            schema: {
                description: 'Update user profile',
                tags: ['Users'],
                params: {
                    type: 'object',
                    properties: { id: { type: 'string' } }
                },
                body: {
                    type: 'object',
                    properties: {
                        full_name: { type: 'string' },
                        occupation: { type: 'string' },
                        bio: { type: 'string' },
                        looking_for: { type: 'string' },
                        city: { type: 'string' },
                        neighborhood: { type: 'string' },
                        languages: { type: 'array', items: { type: 'string' } },
                        dietary_restrictions: { type: 'array', items: { type: 'string' } },
                        avatar_url: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'User updated',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' },
                            name: { type: 'string' },
                            avatarUrl: { type: 'string', nullable: true },
                            occupation: { type: 'string', nullable: true }
                        }
                    }
                }
            }
        }, (req, reply) => userController.updateProfile(req, reply));

        fastify.delete('/bookings', {
            schema: {
                description: 'Cancel booking',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['eventId', 'userId'],
                    properties: {
                        eventId: { type: 'string' },
                        userId: { type: 'string' }
                    }
                },
                response: {
                    204: { description: 'Booking cancelled' }
                }
            }
        }, (req, reply) => eventRegistrationController.delete(req, reply));

        fastify.get('/events/:id', {
            schema: {
                description: 'Get event details',
                tags: ['Events'],
                params: {
                    type: 'object',
                    properties: { id: { type: 'string' } }
                },
                response: {
                    200: {
                        description: 'Event details',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            price: { type: 'number' },
                            maxGuests: { type: 'integer' },
                            eventDate: { type: 'string' },
                            endTime: { type: 'string', nullable: true },
                            reservationDeadline: { type: 'string', nullable: true },
                            location: { type: 'string' },
                            latitude: { type: 'number', nullable: true },
                            longitude: { type: 'number', nullable: true },
                            coverImageUrl: { type: 'string', nullable: true },
                            imageGallery: { type: 'array', items: { type: 'string' } },
                            hostId: { type: 'string' },
                            eventType: { type: 'string', nullable: true },
                            cuisineTypes: { type: 'array', items: { type: 'string' } },
                            vibe: { type: 'array', items: { type: 'string' } },
                            facilities: { type: 'array', items: { type: 'string' } },
                            rules: { type: 'array', items: { type: 'string' } },
                            dietaryOptions: { type: 'array', items: { type: 'string' } },
                            accessType: { type: 'string' },
                            requiresApproval: { type: 'boolean' },
                            allowWaitlist: { type: 'boolean' },
                            autoApproveIfAttended: { type: 'boolean' },
                            autoApproveMinRating: { type: 'number', nullable: true },
                            host: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    fullName: { type: 'string', nullable: true },
                                    username: { type: 'string', nullable: true },
                                    avatarUrl: { type: 'string', nullable: true },
                                    bio: { type: 'string', nullable: true },
                                    isSuperhost: { type: 'boolean' },
                                    occupation: { type: 'string', nullable: true },
                                    email: { type: 'string', nullable: true },
                                    city: { type: 'string', nullable: true },
                                    neighborhood: { type: 'string', nullable: true },
                                    languages: { type: 'array', items: { type: 'string' } },
                                    birthDecade: { type: 'string', nullable: true },
                                    pets: { type: 'string', nullable: true },
                                    expoPushToken: { type: 'string', nullable: true },
                                    updatedAt: { type: 'string', nullable: true }
                                }
                            },
                            dishes: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string', nullable: true },
                                        category: { type: 'string' },
                                        order: { type: 'integer' }
                                    }
                                }
                            },
                            bookings: { type: 'array', items: { type: 'object', additionalProperties: true } },
                            reviews: { type: 'array', items: { type: 'object', additionalProperties: true } },
                            questions: { type: 'array', items: { type: 'object', additionalProperties: true } }
                        }
                    }
                }
            }
        }, (req, reply) => eventController.getById(req, reply));

        // Update Event
        fastify.put('/events/:id', {
            schema: {
                description: 'Update an event',
                tags: ['Events'],
                params: {
                    type: 'object',
                    properties: { id: { type: 'string' } }
                },
                body: {
                    type: 'object',
                    required: ['hostId'],
                    properties: {
                        hostId: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        price: { type: 'number' },
                        maxGuests: { type: 'integer' },
                        eventDate: { type: 'string', format: 'date-time' },
                        location: { type: 'string' },
                        latitude: { type: 'number', nullable: true },
                        longitude: { type: 'number', nullable: true },
                        coverImageUrl: { type: 'string', nullable: true },
                        eventType: { type: 'string', nullable: true },
                        cuisineTypes: { type: 'array', items: { type: 'string' } },
                        vibe: { type: 'array', items: { type: 'string' } },
                        facilities: { type: 'array', items: { type: 'string' } },
                        rules: { type: 'array', items: { type: 'string' } },
                        accessType: { type: 'string' },
                        requiresApproval: { type: 'boolean' },
                        allowWaitlist: { type: 'boolean' },
                        autoApproveIfAttended: { type: 'boolean' },
                        autoApproveMinRating: { type: 'number', nullable: true },
                        questions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    question: { type: 'string' },
                                    questionType: { type: 'string' },
                                    required: { type: 'boolean' },
                                    options: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                },
                response: {
                    200: {
                        description: 'Event updated successfully',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            price: { type: 'number' },
                            maxGuests: { type: 'integer' },
                            eventDate: { type: 'string' },
                            location: { type: 'string' },
                            hostId: { type: 'string' }
                        }
                    },
                    403: {
                        description: 'Not authorized',
                        type: 'object',
                        properties: { message: { type: 'string' } }
                    },
                    404: {
                        description: 'Event not found',
                        type: 'object',
                        properties: { message: { type: 'string' } }
                    }
                }
            }
        }, (req, reply) => eventController.update(req, reply));

        // Delete Event
        fastify.delete('/events/:id', {
            schema: {
                description: 'Delete an event',
                tags: ['Events'],
                params: {
                    type: 'object',
                    properties: { id: { type: 'string' } }
                },
                body: {
                    type: 'object',
                    required: ['hostId'],
                    properties: {
                        hostId: { type: 'string' }
                    }
                },
                response: {
                    204: { description: 'Event deleted successfully' },
                    403: {
                        description: 'Not authorized',
                        type: 'object',
                        properties: { message: { type: 'string' } }
                    },
                    404: {
                        description: 'Event not found',
                        type: 'object',
                        properties: { message: { type: 'string' } }
                    }
                }
            }
        }, (req, reply) => eventController.delete(req, reply));

        const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });

        console.log(`\n🚀 Backend running at: ${address}`);

        // Log LAN IPs for easier access
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        const results = Object.create(null);

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.address);
                }
            }
        }

        console.log('📍 Available on your network:');
        Object.keys(results).forEach(name => {
            results[name].forEach((ip: string) => console.log(`   - http://${ip}:3000`));
        });
        console.log('\n');

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
