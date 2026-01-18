import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { PrismaEventRepository } from './infrastructure/repositories/PrismaEventRepository';
import { CreateEventUseCase } from './application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from './application/use-cases/ListEventsUseCase';
import { CreateBookingUseCase } from './application/use-cases/CreateBookingUseCase';
import { CancelBookingUseCase } from './application/use-cases/CancelBookingUseCase';
import { UpdateUserProfileUseCase } from './application/use-cases/UpdateUserProfileUseCase';
import { EventController } from './presentation/http/controllers/EventController';
import { BookingController } from './presentation/http/controllers/BookingController';
import { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
import { UserController } from './presentation/http/controllers/UserController';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository';
import { PrismaBookingRepository } from './infrastructure/repositories/PrismaBookingRepository';

const fastify = Fastify({
    logger: true
});

const start = async () => {
    try {
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
        const createEventUseCase = new CreateEventUseCase(eventRepository);
        const listEventsUseCase = new ListEventsUseCase(eventRepository);
        const eventController = new EventController(createEventUseCase, listEventsUseCase);

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
                        hostId: { type: 'string' }
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
                                coverImageUrl: { type: 'string', nullable: true }
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

        // Booking Dependencies
        const bookingRepository = new PrismaBookingRepository();
        const createBookingUseCase = new CreateBookingUseCase(bookingRepository, eventRepository);
        const cancelBookingUseCase = new CancelBookingUseCase(bookingRepository);
        const bookingController = new BookingController(createBookingUseCase, cancelBookingUseCase);

        fastify.post('/bookings', {
            schema: {
                description: 'Join an event',
                tags: ['Bookings'],
                body: {
                    type: 'object',
                    required: ['eventId', 'guestId'],
                    properties: {
                        eventId: { type: 'string' },
                        guestId: { type: 'string' }
                    }
                },
                response: {
                    201: {
                        description: 'Booking created successfully',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            eventId: { type: 'string' },
                            guestId: { type: 'string' },
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
        }, (req, reply) => bookingController.create(req, reply));

        // User Dependencies
        const userRepository = new PrismaUserRepository();
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
                    required: ['eventId', 'guestId'],
                    properties: {
                        eventId: { type: 'string' },
                        guestId: { type: 'string' }
                    }
                },
                response: {
                    204: { description: 'Booking cancelled' }
                }
            }
        }, (req, reply) => bookingController.delete(req, reply));

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
                            description: { type: 'string' },
                            price: { type: 'number' },
                            maxGuests: { type: 'integer' },
                            eventDate: { type: 'string' },
                            location: { type: 'string' },
                            latitude: { type: 'number', nullable: true },
                            longitude: { type: 'number', nullable: true },
                            coverImageUrl: { type: 'string', nullable: true },
                            hostId: { type: 'string' }
                        }
                    }
                }
            }
        }, (req, reply) => eventController.getById(req, reply));

        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
