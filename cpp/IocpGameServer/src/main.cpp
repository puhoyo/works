#pragma comment(lib, "Ws2_32.lib")
#include <thread>
#include <iostream>

#include "app/lib/include/user.hpp"
#include "server/include/server.hpp"
#include "app/application.hpp"
#include "server/include/socket.hpp"

namespace IocpGameServer {
	bool logging;
}
using namespace IocpGameServer;

int main(int argc, char* argv[]) {
	if (argc != 3) {
		std::cout << "Usage: " << argv[0] << " port logging(1|0)" << std::endl;
		return 1;
	}

	const auto port = atoi(argv[1]);
	IocpGameServer::logging = static_cast<bool>(atoi(argv[2]));

	//application setup
	auto app = std::make_shared<Application>(logging);

	//channel setup
	//Channel* main_channel = new Channel(1000);

	//network setup
	WSADATA wsa_data;
	HANDLE completion_port;
	SYSTEM_INFO system_info;

	SOCKET server_socket;
	SOCKADDR_IN server_address;
	if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) {
		puts("WSAStartup() error");
	}

	//Create IOCP
	completion_port = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 0);
	GetSystemInfo(&system_info);
	for (DWORD i = 0; i < system_info.dwNumberOfProcessors; i++) {
		//Create on-completion-threads by the number of cpu-cores
		std::thread t(IOCPThreadMain, reinterpret_cast<LPVOID>(completion_port), app);
		t.detach();
	}

	server_socket = WSASocket(AF_INET, SOCK_STREAM, 0, NULL, 0, WSA_FLAG_OVERLAPPED);
	memset(&server_address, 0, sizeof(server_address));
	server_address.sin_family = AF_INET;
	server_address.sin_addr.s_addr = htonl(INADDR_ANY);
	server_address.sin_port = htons(port);

	bind(server_socket, reinterpret_cast<SOCKADDR*>(&server_address), sizeof(server_address));
	listen(server_socket, 10);

	while (true) {
		try {
			SOCKET socket_id;
			SOCKADDR_IN client_address;
			int address_len = sizeof(client_address);

			puts("accept ready...");
			//Accept client's connection request
			socket_id = accept(server_socket, reinterpret_cast<SOCKADDR*>(&client_address), &address_len);
			if (socket_id == INVALID_SOCKET) 
				std::cout << "accept failed with error: " << WSAGetLastError() << std::endl;
			else {
				std::cout << "client connected -> socket ID: " << socket_id << std::endl;

				//Create Socket
				//auto socket = std::make_shared<Socket>(socket_id, client_address);
				auto socket = Socket::CreateSocket(socket_id, client_address, *app);

				//Connect client socket to IO completion port
				CreateIoCompletionPort(reinterpret_cast<HANDLE>(socket_id), completion_port, reinterpret_cast<UINT_PTR>(socket.get()), 0);

				//Ready to receive data from connected client
				socket->Receive();
			}
		}
		catch (std::out_of_range& e) {
			std::cout << "exception: " << e.what() << std::endl;
		}
		catch (...) {
			std::cout << "exception" << std::endl;
		}
	}

	std::cout << "end of main" << std::endl;
	return 0;
}//end of main