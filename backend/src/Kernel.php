<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    protected function configureRoutes(RoutingConfigurator $routes): void
    {
        // Load routes from config/routes.yaml with a /api prefix
        $routes->import('../config/routes.yaml')
            ->prefix('/api');

        // Load attribute routes from src/Controller/
        $routes->import('../src/Controller/', 'attribute');

        // Load other YAML routes from config/routes/ with a /api prefix
        $routes->import('../config/{routes}/*.yaml')
            ->prefix('/api');
    }
}
