import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import path from 'path';
import { ApproveRegistrationUseCase } from './application/use-cases/ApproveRegistrationUseCase';
import { LoginUseCase } from './application/use-cases/Auth/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/Auth/RegisterUseCase';
import { CancelEventRegistrationUseCase } from './application/use-cases/CancelEventRegistrationUseCase';
import { CheckPixPaymentUseCase } from './application/use-cases/CheckPixPaymentUseCase';
import { RequestWithdrawalUseCase } from './application/use-cases/RequestWithdrawalUseCase';
import { ApproveWithdrawalUseCase } from './application/use-cases/ApproveWithdrawalUseCase';
import { CreateEventUseCase } from './application/use-cases/CreateEventUseCase';
import { CreatePixChargeUseCase } from './application/use-cases/CreatePixChargeUseCase';
import { CreateReviewUseCase } from './application/use-cases/CreateReviewUseCase';
import { DeleteEventUseCase } from './application/use-cases/DeleteEventUseCase';
import { DeleteReviewUseCase } from './application/use-cases/DeleteReviewUseCase';
import { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
import { JoinEventUseCase } from './application/use-cases/JoinEventUseCase';
import { ListEventsUseCase } from './application/use-cases/ListEventsUseCase';
import { RejectRegistrationUseCase } from './application/use-cases/RejectRegistrationUseCase';
import { SendNotificationUseCase } from './application/use-cases/SendNotificationUseCase';
import { UpdateEventUseCase } from './application/use-cases/UpdateEventUseCase';
import { UpdateUserProfileUseCase } from './application/use-cases/UpdateUserProfileUseCase';
import { EfiPixService } from './infrastructure/external/EfiPixService';
import { PrismaEventQuestionRepository } from './infrastructure/repositories/PrismaEventQuestionRepository';
import { PrismaEventRegistrationRepository } from './infrastructure/repositories/PrismaEventRegistrationRepository';
import { PrismaEventRepository } from './infrastructure/repositories/PrismaEventRepository';
import { PrismaEventReviewRepository } from './infrastructure/repositories/PrismaEventReviewRepository';
import { PrismaNotificationRepository } from './infrastructure/repositories/PrismaNotificationRepository';
import { PrismaPaymentRepository } from './infrastructure/repositories/PrismaPaymentRepository';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository';
import { PrismaWithdrawalRequestRepository } from './infrastructure/repositories/PrismaWithdrawalRequestRepository';
import { AuthController } from './presentation/http/controllers/AuthController';
import { EventController } from './presentation/http/controllers/EventController';
import { EventRegistrationController } from './presentation/http/controllers/EventRegistrationController';
import { NotificationController } from './presentation/http/controllers/NotificationController';
import { PixPaymentController } from './presentation/http/controllers/PixPaymentController';
import { ReviewController } from './presentation/http/controllers/ReviewController';
import { UserController } from './presentation/http/controllers/UserController';
import { WithdrawalController } from './presentation/http/controllers/WithdrawalController';

// Explicitly load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

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
                    { name: 'Auth', description: 'Authentication endpoints' },
                    { name: 'Bookings', description: 'Event registration and approval endpoints' },
                    { name: 'Events', description: 'Event management endpoints' },
                    { name: 'Notifications', description: 'Push and in-app notification endpoints' },
                    { name: 'Revews', description: 'Event review endpoints' },
                    { name: 'Users', description: 'User profile endpoints' },
                    { name: 'Payments', description: 'PIX payment endpoints' },
                    { name: 'Withdrawals', description: 'Host Withdrawal endpoints' },
                    { name: 'General', description: 'General and health endpoints' }
                ],
                components: {
                    schemas: {
                        ErrorResponse: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' }
                            }
                        }
                    }
                }
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

        fastify.get('/docs-spec/json', {
            schema: {
                hide: true
            }
        }, async (_req, reply) => {
            return reply.send(fastify.swagger());
        });

        fastify.get('/docs-spec/yaml', {
            schema: {
                hide: true
            }
        }, async (_req, reply) => {
            reply.type('application/yaml');
            return reply.send(fastify.swagger({ yaml: true }));
        });



        // Dependency Injection (Manual for now)
        const eventRepository = new PrismaEventRepository();
        const eventQuestionRepository = new PrismaEventQuestionRepository();
        const userRepository = new PrismaUserRepository();
        const { notificationService } = require('./application/services/NotificationService'); // Import service
        const notificationRepository = new PrismaNotificationRepository();
        const sendNotificationUseCase = new SendNotificationUseCase(notificationRepository, notificationService);
        const eventRegistrationRepository = new PrismaEventRegistrationRepository();
        const eventReviewRepository = new PrismaEventReviewRepository();
        const paymentRepository = new PrismaPaymentRepository();
        const withdrawalRepository = new PrismaWithdrawalRequestRepository();
        const efiPixService = new EfiPixService();

        // Use Cases
        const requestWithdrawalUseCase = new RequestWithdrawalUseCase(userRepository, withdrawalRepository);
        const approveWithdrawalUseCase = new ApproveWithdrawalUseCase(withdrawalRepository, userRepository, efiPixService);
        const createEventUseCase = new CreateEventUseCase(eventRepository, eventQuestionRepository, userRepository);
        const listEventsUseCase = new ListEventsUseCase(eventRepository);
        const updateEventUseCase = new UpdateEventUseCase(eventRepository, eventQuestionRepository);
        const deleteEventUseCase = new DeleteEventUseCase(eventRepository, eventRegistrationRepository, sendNotificationUseCase);
        
        const joinEventUseCase = new JoinEventUseCase(eventRegistrationRepository, eventRepository, sendNotificationUseCase);
        const cancelEventRegistrationUseCase = new CancelEventRegistrationUseCase(eventRegistrationRepository, eventRepository, sendNotificationUseCase);
        const approveRegistrationUseCase = new ApproveRegistrationUseCase(eventRegistrationRepository, sendNotificationUseCase);
        const rejectRegistrationUseCase = new RejectRegistrationUseCase(eventRegistrationRepository, sendNotificationUseCase);

        const createPixChargeUseCase = new CreatePixChargeUseCase(efiPixService, eventRepository, eventRegistrationRepository, paymentRepository);
        const checkPixPaymentUseCase = new CheckPixPaymentUseCase(efiPixService, paymentRepository, eventRegistrationRepository, eventRepository, sendNotificationUseCase, userRepository);

        const createReviewUseCase = new CreateReviewUseCase(eventReviewRepository, eventRepository, sendNotificationUseCase);
        const deleteReviewUseCase = new DeleteReviewUseCase(eventReviewRepository);

        const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
        const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);

        const loginUseCase = new LoginUseCase();
        const registerUseCase = new RegisterUseCase();

        // Controllers
        const eventController = new EventController(createEventUseCase, listEventsUseCase, updateEventUseCase, deleteEventUseCase);
        const reviewController = new ReviewController(createReviewUseCase, deleteReviewUseCase);
        const authController = new AuthController(loginUseCase, registerUseCase);
        const eventRegistrationController = new EventRegistrationController(
            joinEventUseCase,
            cancelEventRegistrationUseCase,
            approveRegistrationUseCase,
            rejectRegistrationUseCase,
            eventRegistrationRepository
        );
        const userController = new UserController(getUserProfileUseCase, updateUserProfileUseCase);
        const notificationController = new NotificationController(notificationRepository);
        const pixPaymentController = new PixPaymentController(createPixChargeUseCase, checkPixPaymentUseCase);
        const withdrawalController = new WithdrawalController(requestWithdrawalUseCase, approveWithdrawalUseCase, withdrawalRepository);

        // Auth Routes
        fastify.post('/auth/login', {
            schema: {
                summary: 'Authenticate with email and password',
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
                summary: 'Register a new user account',
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
                summary: 'Create event',
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
                summary: 'List events',
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

        fastify.post('/reviews', {
            schema: {
                summary: 'Create review',
                description: 'Create a review',
                tags: ['Reviews'],
                body: {
                    type: 'object',
                    required: ['eventId', 'userId', 'rating'],
                    properties: {
                        eventId: { type: 'string' },
                        userId: { type: 'string' },
                        rating: { type: 'number', minimum: 1, maximum: 5 },
                        comment: { type: 'string' }
                    }
                },
                response: {
                    201: {
                        description: 'Review created',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            eventId: { type: 'string' },
                            userId: { type: 'string' },
                            rating: { type: 'number' },
                            comment: { type: 'string', nullable: true },
                            createdAt: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => reviewController.create(req, reply));


        fastify.get('/', {
            schema: {
                summary: 'Health check',
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

        fastify.post('/bookings', {
            schema: {
                summary: 'Create event booking',
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
                summary: 'List event bookings',
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
                                        fullName: { type: 'string', nullable: true },
                                        avatarUrl: { type: 'string', nullable: true },
                                        occupation: { type: 'string', nullable: true },
                                        bio: { type: 'string', nullable: true },
                                        lookingFor: { type: 'string', nullable: true },
                                        city: { type: 'string', nullable: true },
                                        neighborhood: { type: 'string', nullable: true },
                                        languages: { type: 'array', items: { type: 'string' } },
                                        dietaryRestrictions: { type: 'array', items: { type: 'string' } },
                                        phoneNumber: { type: 'string', nullable: true },
                                        expoPushToken: { type: 'string', nullable: true },
                                        updatedAt: { type: 'string', nullable: true }
                                    }
                                },
                                createdAt: { type: 'string' },
                                answers: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            questionId: { type: 'string' },
                                            question: { type: 'string' },
                                            answer: { type: 'string' }
                                        }
                                    }
                                }
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
                summary: 'Approve booking',
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
                summary: 'Reject booking',
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

        fastify.post('/bookings/validate-ticket', {
            schema: {
                summary: 'Validate event ticket',
                description: 'Host scans QR code to validate participant ticket',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['bookingId', 'hostId'],
                    properties: {
                        bookingId: { type: 'string' },
                        hostId: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'Ticket validation result',
                        type: 'object',
                        properties: {
                            valid: { type: 'boolean' },
                            message: { type: 'string' },
                            booking: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    status: { type: 'string' },
                                    user: {
                                        type: 'object',
                                        nullable: true,
                                        properties: {
                                            id: { type: 'string' },
                                            fullName: { type: 'string' },
                                            avatarUrl: { type: 'string', nullable: true }
                                        }
                                    },
                                    event: {
                                        type: 'object',
                                        nullable: true,
                                        properties: {
                                            id: { type: 'string' },
                                            title: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, (req, reply) => eventRegistrationController.validateTicket(req, reply));

        interface NotificationTestBody {
            token: string;
            title: string;
            body: string;
            data?: Record<string, any>;
        }

        fastify.post<{ Body: NotificationTestBody }>('/notifications/test', {
            schema: {
                summary: 'Send test push notification',
                description: 'Send a test push notification',
                tags: ['Notifications'],
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

        // Notification endpoints
        fastify.get('/notifications', {
            schema: {
                summary: 'List notifications',
                description: 'Get user notifications',
                tags: ['Notifications'],
                querystring: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' }
                    },
                    required: ['userId']
                },
                response: {
                    200: {
                        description: 'List of notifications',
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                body: { type: 'string' },
                                type: { type: 'string' },
                                read: { type: 'boolean' },
                                createdAt: { type: 'string' },
                                data: { type: 'object', additionalProperties: true }
                            }
                        }
                    }
                }
            }
        }, (req, reply) => notificationController.list(req as any, reply));

        fastify.put<{ Params: { id: string } }>('/notifications/:id/read', {
            schema: {
                summary: 'Mark notification as read',
                description: 'Mark notification as read',
                tags: ['Notifications'],
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'Notification marked as read',
                        type: 'object',
                        properties: { success: { type: 'boolean' } }
                    }
                }
            }
        }, (req, reply) => notificationController.markAsRead(req, reply));

        fastify.get('/users/:id', {
            schema: {
                summary: 'Get user profile',
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
                            walletBalance: { type: 'number' },
                            pixKey: { type: 'string', nullable: true },
                            pixKeyType: { type: 'string', nullable: true },
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
                summary: 'Update user profile',
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
                        avatar_url: { type: 'string' },
                        pix_key: { type: 'string' },
                        pix_key_type: { type: 'string' }
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

        // Withdrawals
        fastify.post('/withdrawals', {
            schema: {
                summary: 'Request withdrawal',
                description: 'Host request withdrawal of their available balance',
                tags: ['Withdrawals'],
                body: {
                    type: 'object',
                    required: ['userId', 'amount'],
                    properties: {
                        userId: { type: 'string' },
                        amount: { type: 'number' }
                    }
                },
                response: {
                    201: {
                        description: 'Withdrawal requested',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            userId: { type: 'string' },
                            amount: { type: 'number' },
                            status: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => withdrawalController.requestWithdrawal(req, reply));

        fastify.post('/admin/withdrawals/:id/approve', {
            schema: {
                summary: 'Approve withdrawal (Admin)',
                description: 'Admin approves a pending withdrawal and sends the PIX',
                tags: ['Withdrawals'],
                params: {
                    type: 'object',
                    properties: { id: { type: 'string' } }
                },
                response: {
                    200: {
                        description: 'Withdrawal approved',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            status: { type: 'string' },
                            efiEndToEndId: { type: 'string', nullable: true }
                        }
                    }
                }
            }
        }, (req, reply) => withdrawalController.approveWithdrawal(req, reply));

        // Get all withdrawals for Admin UI
        fastify.get('/admin/withdrawals', {
            schema: {
                summary: 'List all withdrawals (Admin)',
                description: 'List all withdrawals requests',
                tags: ['Withdrawals'],
                response: {
                    200: {
                        description: 'List of withdrawals',
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                userId: { type: 'string' },
                                amount: { type: 'number' },
                                status: { type: 'string' },
                                pixKey: { type: 'string' },
                                pixKeyType: { type: 'string', nullable: true },
                                efiEndToEndId: { type: 'string', nullable: true },
                                createdAt: { type: 'string' },
                            }
                        }
                    }
                }
            }
        }, (req, reply) => withdrawalController.listAll(req, reply));

        fastify.delete('/bookings', {
            schema: {
                summary: 'Cancel booking',
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
                summary: 'Get event by id',
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
                                    phoneNumber: { type: 'string', nullable: true },
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
                summary: 'Update event',
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
                summary: 'Delete event',
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

        fastify.delete('/reviews/:id', {
            schema: {
                summary: 'Delete review',
                description: 'Delete a review authored by the requesting user',
                tags: ['Reviews'],
                params: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'string' }
                    }
                },
                body: {
                    type: 'object',
                    required: ['userId'],
                    properties: {
                        userId: { type: 'string' }
                    }
                },
                response: {
                    204: { description: 'Review deleted successfully' },
                    403: {
                        description: 'Only review author can delete',
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        }
                    },
                    404: {
                        description: 'Review not found',
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => reviewController.delete(req, reply));

        // PIX Payment Routes
        fastify.post('/payments/pix', {
            schema: {
                summary: 'Create PIX charge',
                description: 'Generate a PIX QR code for event registration payment',
                tags: ['Payments'],
                body: {
                    type: 'object',
                    required: ['bookingId', 'eventId', 'userId'],
                    properties: {
                        bookingId: { type: 'string' },
                        eventId: { type: 'string' },
                        userId: { type: 'string' }
                    }
                },
                response: {
                    201: {
                        description: 'PIX charge created',
                        type: 'object',
                        properties: {
                            paymentId: { type: 'string' },
                            txid: { type: 'string' },
                            qrcode: { type: 'string' },
                            pixCopiaECola: { type: 'string' },
                            valor: { type: 'string' },
                            status: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => pixPaymentController.createCharge(req, reply));

        fastify.get('/payments/pix/:bookingId', {
            schema: {
                summary: 'Check PIX payment status',
                description: 'Check if a PIX payment has been confirmed',
                tags: ['Payments'],
                params: {
                    type: 'object',
                    properties: {
                        bookingId: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        description: 'Payment status',
                        type: 'object',
                        properties: {
                            paymentId: { type: 'string' },
                            txid: { type: 'string' },
                            status: { type: 'string' },
                            paid: { type: 'boolean' }
                        }
                    }
                }
            }
        }, (req, reply) => pixPaymentController.checkPayment(req, reply));

        const port = Number(process.env.PORT) || 3000;
        const address = await fastify.listen({ port, host: '0.0.0.0' });

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
