import React from 'react';
import { Link } from 'wouter';

import { Facebook, Github, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

const Footer: React.FC = () => {

    const socialLinks = {
        linkedin: {
            url: "#",
            icon: Linkedin,
            label: "LinkedIn"
        },
        twitter: {
            url: "#",
            icon: Twitter,
            label: "Twitter"
        },
        instagram: {
            url: "#",
            icon: Instagram,
            label: "Instagram"
        },
        facebook: {
            url: "#",
            icon: Facebook,
            label: "Facebook"
        },
    };

    return (
        <footer className="w-full bg-black border-t border-white/[0.08] px-4 sm:px-8 lg:px-0">
            <div className="max-w-7xl mx-auto py-16 lg:px-12">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-0 mb-12">

                    {/* Brand Column */}
                    <div className="flex flex-col gap-4">
                        {/* Logo and Brand */}
                        <div className="flex items-center gap-3">
                            {/* Logo Icon */}
                            <div className="relative w-11 h-11 flex items-center justify-center overflow-hidden">
                                <img src={"/logo.svg"} width={44} height={44} alt='logo' className='relative w-11 h-11' />
                            </div>

                            {/* Brand Name */}
                            <h2 className="text-white font-bold text-xl tracking-[-0.45px]">
                                RemitWise
                            </h2>
                        </div>

                        {/* Tagline */}
                        <p className="text-white/50 text-sm leading-[23px] tracking-[-0.15px] max-w-[200px]">
                            Building financial security for families worldwide through intelligent remittance solutions.
                        </p>
                    </div>

                    {/* Useful Links Column */}
                    <div className="flex flex-col gap-4 lg:pl-12">
                        <h3 className="text-white font-semibold text-base leading-6 tracking-[-0.31px]">
                            Useful Links
                        </h3>
                        <ul className="flex flex-col gap-3">
                            <li>
                                <Link href="/" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    About us
                                </Link>
                            </li>
                            <li>
                                <Link href="/testimonials" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Testimonials
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Help Column */}
                    <div className="flex flex-col gap-4 lg:pl-12">
                        <h3 className="text-white font-semibold text-base leading-6 tracking-[-0.31px]">
                            Help
                        </h3>
                        <ul className="flex flex-col gap-3">
                            <li>
                                <Link href="/help-center" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/faq" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    FAQ
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Column */}
                    <div className="flex flex-col gap-4 lg:pl-12">
                        <h3 className="text-white font-semibold text-base leading-6 tracking-[-0.31px]">
                            Contact With Us
                        </h3>
                        <a
                            href="mailto:support@remitwise.com"
                            className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] hover:text-white transition-colors"
                        >
                            support@remitwise.com
                        </a>

                        {/* Social Media Icons */}
                        <div className="flex items-center gap-3">
                            {Object.values(socialLinks).map((social, index) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={index}
                                        href={social.url}
                                        aria-label={social.label}
                                        className="w-9 h-9 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors"
                                    >
                                        <Icon size={16} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Copyright Section */}
                <div className="pt-6 border-t border-white/[0.08]">
                    <p className="text-white/50 text-sm leading-[21px] tracking-[-0.15px] text-center">
                        © 2024 RemitWise.com. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;